//! Pure UTC date/time helpers (no chrono dependency).
//!
//! Timestamps are stored as ISO-8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`) so the DB
//! seam's `lt`/`gte` filters compare chronologically (06 doc). Civil-date math
//! uses Howard Hinnant's `days_from_civil`/`civil_from_days` algorithms.

const SECS_PER_DAY: i64 = 86_400;

/// Days since 1970-01-01 for a proleptic-Gregorian civil date.
fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = (if y >= 0 { y } else { y - 399 }) / 400;
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

/// Civil `(year, month, day)` for a day count since 1970-01-01.
fn civil_from_days(z: i64) -> (i64, i64, i64) {
    let z = z + 719_468;
    let era = (if z >= 0 { z } else { z - 146_096 }) / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (if m <= 2 { y + 1 } else { y }, m, d)
}

/// `YYYY-MM-DDTHH:MM:SSZ` for a Unix timestamp.
pub fn iso8601(secs: i64) -> String {
    let days = secs.div_euclid(SECS_PER_DAY);
    let rem = secs.rem_euclid(SECS_PER_DAY);
    let (y, m, d) = civil_from_days(days);
    let (h, mi, s) = (rem / 3600, (rem % 3600) / 60, rem % 60);
    format!("{y:04}-{m:02}-{d:02}T{h:02}:{mi:02}:{s:02}Z")
}

/// `YYYY-MM-DD` for a Unix timestamp.
pub fn date_str(secs: i64) -> String {
    let (y, m, d) = civil_from_days(secs.div_euclid(SECS_PER_DAY));
    format!("{y:04}-{m:02}-{d:02}")
}

/// Unix timestamp at the start (00:00:00 UTC) of the day containing `secs`.
pub fn day_start_secs(secs: i64) -> i64 {
    secs - secs.rem_euclid(SECS_PER_DAY)
}

/// ISO-8601 at the start of the day containing `secs`.
pub fn day_start_iso(secs: i64) -> String {
    iso8601(day_start_secs(secs))
}

fn parse_num(s: &str) -> Option<i64> {
    if s.is_empty() || !s.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    s.parse().ok()
}

fn is_leap_year(y: i64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

fn days_in_month(y: i64, m: i64) -> i64 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if is_leap_year(y) => 29,
        2 => 28,
        _ => 0,
    }
}

/// Parses `YYYY-MM-DD` to the Unix timestamp at 00:00:00 UTC.
pub fn parse_date(s: &str) -> Option<i64> {
    let mut parts = s.trim().splitn(3, '-');
    let y = parse_num(parts.next()?)?;
    let m = parse_num(parts.next()?)?;
    let d = parse_num(parts.next()?)?;
    if !(1..=12).contains(&m) || !(1..=days_in_month(y, m)).contains(&d) {
        return None;
    }
    Some(days_from_civil(y, m, d) * SECS_PER_DAY)
}

fn split_time_and_offset(rest: &str) -> Option<(&str, i64)> {
    let Some(idx) = rest.find(['Z', '+', '-']) else {
        return Some((rest, 0));
    };
    let offset = match rest.as_bytes()[idx] {
        b'+' => parse_offset_secs(&rest[idx + 1..])?,
        b'-' => -parse_offset_secs(&rest[idx + 1..])?,
        _ => 0,
    };
    Some((&rest[..idx], offset))
}

fn parse_offset_secs(offset: &str) -> Option<i64> {
    let offset = offset.split('.').next().unwrap_or(offset);
    let mut parts = offset.splitn(3, ':');
    let h = parse_num(parts.next()?)?;
    let mi = parse_num(parts.next().unwrap_or("0"))?;
    if h > 23 || mi > 59 {
        return None;
    }
    Some(h * 3600 + mi * 60)
}

/// Parses an ISO-8601 timestamp (`YYYY-MM-DDTHH:MM:SS`, optional fractional
/// seconds, `Z`, or numeric offset) to a UTC Unix timestamp.
pub fn parse_iso(s: &str) -> Option<i64> {
    let s = s.trim();
    let (date, rest) = s.split_once(['T', ' '])?;
    let day_secs = parse_date(date)?;
    let (time_with_fraction, offset_secs) = split_time_and_offset(rest)?;
    let time = time_with_fraction.split('.').next().unwrap_or("");
    let mut tparts = time.splitn(3, ':');
    let h = parse_num(tparts.next()?)?;
    let mi = parse_num(tparts.next()?)?;
    let sec = parse_num(tparts.next().unwrap_or("0")).unwrap_or(0);
    if h > 23 || mi > 59 || sec > 60 {
        return None;
    }
    Some(day_secs + h * 3600 + mi * 60 + sec - offset_secs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_known_epoch() {
        assert_eq!(iso8601(0), "1970-01-01T00:00:00Z");
        // 2026-05-31T12:00:00Z
        let secs = parse_iso("2026-05-31T12:00:00Z").unwrap();
        assert_eq!(iso8601(secs), "2026-05-31T12:00:00Z");
        assert_eq!(date_str(secs), "2026-05-31");
    }

    #[test]
    fn round_trips_dates_across_leap_years() {
        for s in ["2024-02-29", "2000-01-01", "2026-12-31", "1999-03-01"] {
            assert_eq!(date_str(parse_date(s).unwrap()), s);
        }
    }

    #[test]
    fn day_start_truncates() {
        let noon = parse_iso("2026-05-31T12:34:56Z").unwrap();
        assert_eq!(day_start_iso(noon), "2026-05-31T00:00:00Z");
    }

    #[test]
    fn iso_strings_compare_chronologically() {
        // The whole reason we store ISO-8601: lexical order == time order.
        assert!(iso8601(1000) < iso8601(2000));
        assert!("2026-05-31T00:00:00Z" < "2026-05-31T00:00:01Z");
        assert!("2026-01-01T00:00:00Z" < "2026-12-31T23:59:59Z");
    }

    #[test]
    fn rejects_garbage() {
        assert!(parse_date("not-a-date").is_none());
        assert!(parse_date("2026-02-29").is_none());
        assert!(parse_date("2026-02-31").is_none());
        assert!(parse_date("2024-02-30").is_none());
        assert!(parse_iso("2026-05-31").is_none());
        assert!(parse_iso("2026-13-01T00:00:00Z").is_none());
        assert!(parse_iso("2026-05-31T12:00:00+24:00").is_none());
        assert!(parse_iso("2026-05-31T12:00:00+02:99").is_none());
    }

    #[test]
    fn parses_numeric_offsets_as_utc() {
        assert_eq!(
            parse_iso("2026-05-31T12:00:00+02:30"),
            parse_iso("2026-05-31T09:30:00Z")
        );
        assert_eq!(
            parse_iso("2026-05-31T12:00:00-07:00"),
            parse_iso("2026-05-31T19:00:00Z")
        );
        assert_eq!(
            parse_iso("2026-05-31T23:30:00+02:00"),
            parse_iso("2026-05-31T21:30:00Z")
        );
    }
}
