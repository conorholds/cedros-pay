//! Solana transaction wire-format parser (legacy + v0), hand-rolled for
//! `wasm32-wasip2`.
//!
//! The official `solana-transaction`/`solana-message` crates don't component-link
//! under wasip2 (see [`super::pubkey`]). The wire format is stable and small, so
//! we decode it directly: compact-u16 (shortvec) lengths, the message header,
//! static account keys, blockhash, compiled instructions, and v0 address-table
//! lookups. Pinned byte-for-byte by known-answer fixtures built with the real
//! `solana-sdk` on the host (see tests).

use super::pubkey::Pubkey;

/// A compiled instruction: indices into the message's account-key array plus the
/// opaque instruction data.
#[derive(Debug, Clone)]
pub struct CompiledInstruction {
    pub program_id_index: u8,
    pub accounts: Vec<u8>,
    pub data: Vec<u8>,
}

/// A decoded versioned transaction. `account_keys` are the *static* keys only;
/// v0 address-table-lookup accounts are not resolved here (that needs an RPC
/// `getAccountInfo` on the lookup table) — [`account_key`] fails closed for any
/// index beyond the static set.
#[derive(Debug, Clone)]
pub struct ParsedTransaction {
    pub signatures: Vec<[u8; 64]>,
    pub num_required_signatures: u8,
    pub account_keys: Vec<Pubkey>,
    pub recent_blockhash: [u8; 32],
    pub instructions: Vec<CompiledInstruction>,
    /// The exact message bytes that were signed (legacy: no prefix; v0: includes
    /// the `0x80` version byte) — used for ed25519 signature verification.
    pub message_bytes: Vec<u8>,
    /// `None` = legacy, `Some(0)` = v0.
    pub version: Option<u8>,
    pub has_address_table_lookups: bool,
}

impl ParsedTransaction {
    /// The fee payer is the first account key (and first signer).
    pub fn fee_payer(&self) -> Option<&Pubkey> {
        self.account_keys.first()
    }

    /// Resolve a static account key by index, failing closed for out-of-range
    /// (including v0 address-table-lookup) indices.
    pub fn account_key(&self, index: u8) -> Option<&Pubkey> {
        self.account_keys.get(index as usize)
    }

    /// Message header privileges, never RPC-supplied account flags.
    pub fn is_writable(&self, index: u8) -> bool {
        let header = usize::from(self.version.is_some());
        let Some(readonly_signed) = self.message_bytes.get(header + 1) else {
            return false;
        };
        let Some(readonly_unsigned) = self.message_bytes.get(header + 2) else {
            return false;
        };
        let index = usize::from(index);
        let required = usize::from(self.num_required_signatures);
        if index < required {
            index < required.saturating_sub(usize::from(*readonly_signed))
        } else {
            index
                < self
                    .account_keys
                    .len()
                    .saturating_sub(usize::from(*readonly_unsigned))
        }
    }

    /// Re-serialize to the binary `VersionedTransaction` wire form: a shortvec
    /// signature count, the 64-byte signatures, then the exact (unmodified) message
    /// bytes. The inverse of [`parse`] — `parse(tx.serialize())` round-trips.
    pub fn serialize(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(3 + self.signatures.len() * 64 + self.message_bytes.len());
        encode_compact_u16(self.signatures.len(), &mut out);
        for sig in &self.signatures {
            out.extend_from_slice(sig);
        }
        out.extend_from_slice(&self.message_bytes);
        out
    }
}

/// Encode a Solana compact-u16 (shortvec) length: 7 bits per byte, high bit =
/// continuation. The inverse of [`decode_compact_u16`].
fn encode_compact_u16(mut value: usize, out: &mut Vec<u8>) {
    loop {
        let mut byte = (value & 0x7f) as u8;
        value >>= 7;
        if value != 0 {
            byte |= 0x80;
        }
        out.push(byte);
        if value == 0 {
            break;
        }
    }
}

/// Build the canonical bytes of a **legacy** (version=None) message: header (3
/// bytes), shortvec account keys, blockhash, shortvec instructions. This is the
/// exact inverse of the slice [`parse`] captures as `message_bytes` for a legacy
/// transaction, so `parse` of a transaction assembled from these bytes round-trips
/// to the same fields. Used by the server-signed refund builder
/// ([`super::refund`]); the server only ever signs bytes it constructs here, never
/// bytes supplied by a client.
pub(crate) fn build_legacy_message(
    num_required_signatures: u8,
    num_readonly_signed: u8,
    num_readonly_unsigned: u8,
    account_keys: &[Pubkey],
    recent_blockhash: &[u8; 32],
    instructions: &[CompiledInstruction],
) -> Vec<u8> {
    let mut out = Vec::new();
    out.push(num_required_signatures);
    out.push(num_readonly_signed);
    out.push(num_readonly_unsigned);
    encode_compact_u16(account_keys.len(), &mut out);
    for key in account_keys {
        out.extend_from_slice(key);
    }
    out.extend_from_slice(recent_blockhash);
    encode_compact_u16(instructions.len(), &mut out);
    for ix in instructions {
        out.push(ix.program_id_index);
        encode_compact_u16(ix.accounts.len(), &mut out);
        out.extend_from_slice(&ix.accounts);
        encode_compact_u16(ix.data.len(), &mut out);
        out.extend_from_slice(&ix.data);
    }
    out
}

/// Decode a Solana compact-u16 (shortvec) length prefix: 1–3 bytes, 7 bits each,
/// high bit = continuation.
fn decode_compact_u16(data: &[u8], cursor: &mut usize) -> Result<usize, &'static str> {
    let mut value: u32 = 0;
    let mut shift = 0u32;
    loop {
        let byte = *data.get(*cursor).ok_or("truncated length")?;
        *cursor += 1;
        value |= ((byte & 0x7f) as u32) << shift;
        if shift > 0 && byte == 0 {
            return Err("noncanonical shortvec");
        }
        if byte & 0x80 == 0 {
            break;
        }
        shift += 7;
        if shift > 14 {
            return Err("compact-u16 too long");
        }
    }
    if value > u16::MAX as u32 {
        return Err("compact-u16 out of range");
    }
    Ok(value as usize)
}

fn take<'a>(data: &'a [u8], cursor: &mut usize, n: usize) -> Result<&'a [u8], &'static str> {
    let end = cursor.checked_add(n).ok_or("length overflow")?;
    let slice = data
        .get(*cursor..end)
        .ok_or("unexpected end of transaction")?;
    *cursor = end;
    Ok(slice)
}

fn take_32(data: &[u8], cursor: &mut usize) -> Result<[u8; 32], &'static str> {
    Ok(take(data, cursor, 32)?.try_into().unwrap())
}

/// Parse a binary-serialized `VersionedTransaction` (the bytes inside the
/// base64/base58 payment proof).
pub fn parse(bytes: &[u8]) -> Result<ParsedTransaction, &'static str> {
    if bytes.len() > 1_232 {
        return Err("transaction exceeds Solana packet size");
    }
    let mut c = 0usize;

    let num_sigs = decode_compact_u16(bytes, &mut c)?;
    if num_sigs > 64 {
        return Err("implausible signature count");
    }
    let mut signatures = Vec::with_capacity(num_sigs);
    for _ in 0..num_sigs {
        signatures.push(take(bytes, &mut c, 64)?.try_into().unwrap());
    }

    let message_start = c;
    let first = *bytes.get(c).ok_or("truncated message")?;
    let version = if first & 0x80 != 0 {
        let v = first & 0x7f;
        if v != 0 {
            return Err("unsupported message version");
        }
        c += 1; // consume the version byte (legacy has none)
        Some(0u8)
    } else {
        None
    };

    let num_required_signatures = *bytes.get(c).ok_or("truncated header")?;
    c += 3; // num_required_signatures, num_readonly_signed, num_readonly_unsigned

    let num_keys = decode_compact_u16(bytes, &mut c)?;
    let mut account_keys = Vec::with_capacity(num_keys);
    for _ in 0..num_keys {
        account_keys.push(take_32(bytes, &mut c)?);
    }

    let recent_blockhash = take_32(bytes, &mut c)?;

    let num_ix = decode_compact_u16(bytes, &mut c)?;
    let mut instructions = Vec::with_capacity(num_ix);
    for _ in 0..num_ix {
        let program_id_index = *bytes.get(c).ok_or("truncated instruction")?;
        c += 1;
        let n_acc = decode_compact_u16(bytes, &mut c)?;
        let accounts = take(bytes, &mut c, n_acc)?.to_vec();
        let n_data = decode_compact_u16(bytes, &mut c)?;
        let data = take(bytes, &mut c, n_data)?.to_vec();
        instructions.push(CompiledInstruction {
            program_id_index,
            accounts,
            data,
        });
    }

    let mut has_address_table_lookups = false;
    if version == Some(0) {
        let n_atl = decode_compact_u16(bytes, &mut c)?;
        has_address_table_lookups = n_atl > 0;
        for _ in 0..n_atl {
            let _table_key = take_32(bytes, &mut c)?;
            let n_w = decode_compact_u16(bytes, &mut c)?;
            let _ = take(bytes, &mut c, n_w)?;
            let n_r = decode_compact_u16(bytes, &mut c)?;
            let _ = take(bytes, &mut c, n_r)?;
        }
    }

    let message_bytes = bytes
        .get(message_start..c)
        .ok_or("message slice out of range")?
        .to_vec();

    if c != bytes.len() || num_sigs != usize::from(num_required_signatures) {
        return Err("noncanonical transaction encoding");
    }
    let header = usize::from(version.is_some());
    let readonly_signed = usize::from(message_bytes[header + 1]);
    let readonly_unsigned = usize::from(message_bytes[header + 2]);
    let required = usize::from(num_required_signatures);
    if required == 0
        || required > account_keys.len()
        || readonly_signed >= required
        || readonly_unsigned > account_keys.len() - required
        || account_keys
            .iter()
            .enumerate()
            .any(|(i, key)| account_keys[..i].contains(key))
        || has_address_table_lookups
        || instructions.iter().any(|ix| {
            usize::from(ix.program_id_index) >= account_keys.len()
                || ix
                    .accounts
                    .iter()
                    .any(|index| usize::from(*index) >= account_keys.len())
        })
    {
        return Err("invalid or unsupported transaction accounts");
    }

    Ok(ParsedTransaction {
        signatures,
        num_required_signatures,
        account_keys,
        recent_blockhash,
        instructions,
        message_bytes,
        version,
        has_address_table_lookups,
    })
}

#[cfg(test)]
pub(crate) mod fixtures {
    use base64::{engine::general_purpose::STANDARD as B64, Engine};

    pub const PAYER: &str = "AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9";
    pub const DEST_ATA: &str = "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B";
    pub const MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    pub const AMOUNT: u64 = 1_500_000;
    pub const DECIMALS: u8 = 6;

    // Built by the host `solana-sdk` oracle (see /tmp generator in the port log).
    pub const TRANSFER_CHECKED: &str = "AagrWGLSIaNvgk5GsPOWR7jdvJqU3yOgdRzXpDKtSRxqU5hUXee6vHpR+Wm3dhCOn+IulYMaqTNintd4CYZHwQABAAIFiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1wryQI4aGkCwmHzZMYU8eyrT/PgX1gaHAgFP8dT003nbNPqjPWsrKjNBSB1EhdcQ871Sl3Znt4goWtVJTc485fcBt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKnG+nrzvtutOj1l82qryXQxsbvkwtL24OR8pgIDRS9dYQcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHAQMEAQQCAAoMYOMWAAAAAAAG";
    pub const TRANSFER_CHECKED_MEMO: &str = "AccblwnzyjSa1nVnIBmkKUzPW33+lYBJZyfHo5WfwV/TWSAHNus/N14eH2mM2NPbp1Bx8YsqQvNlc8z5HVaB+AUBAAMGiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1wryQI4aGkCwmHzZMYU8eyrT/PgX1gaHAgFP8dT003nbNPqjPWsrKjNBSB1EhdcQ871Sl3Znt4goWtVJTc485fcBUpTWpkpIQZNJOhxYNo4fHw1td28kruB5B+oQEEFRI0G3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8Aqcb6evO+2606PWXzaqvJdDGxu+TC0vbg5HymAgNFL11hBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcCBAQBBQIACgxg4xYAAAAAAAYDAQAccmVzb3VyY2U9cHJvZF8xO25vbmNlPWFiYzEyMw==";
    pub const PLAIN_TRANSFER: &str = "AaqKv22HceyLf0c2WTo75QCF50eH1xA9lx/WgT3j4sdDpuqZSvDY3poEeActTQeqNXvDRJwaMAdshmpb2wNptg0BAAEEiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1wryQI4aGkCwmHzZMYU8eyrT/PgX1gaHAgFP8dT003nbNPqjPWsrKjNBSB1EhdcQ871Sl3Znt4goWtVJTc485fcBt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKkHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwEDAwECAAkDYOMWAAAAAAA=";

    pub fn decode(b64: &str) -> Vec<u8> {
        B64.decode(b64).expect("valid base64 fixture")
    }
}

#[cfg(test)]
mod tests {
    use super::fixtures::*;
    use super::*;
    use crate::x402::pubkey;

    #[test]
    fn rejects_trailing_bytes_noncanonical_lengths_and_invalid_headers() {
        let valid = decode(TRANSFER_CHECKED_MEMO);
        let mut trailing = valid.clone();
        trailing.push(0);
        assert!(parse(&trailing).is_err());
        let mut overlong = vec![0x81, 0];
        overlong.extend_from_slice(&valid[1..]);
        assert!(parse(&overlong).is_err());
        let mut header = valid.clone();
        header[65] = 2;
        assert!(parse(&header).is_err());
        let mut readonly_payer = valid;
        readonly_payer[66] = 1;
        assert!(parse(&readonly_payer).is_err());
        assert!(parse(&vec![0; 1_233]).is_err());
    }

    #[test]
    fn parses_legacy_transfer_checked_structure() {
        let tx = parse(&decode(TRANSFER_CHECKED)).unwrap();
        assert_eq!(tx.version, None, "fixture is a legacy message");
        assert_eq!(tx.num_required_signatures, 1);
        assert_eq!(tx.signatures.len(), 1);
        assert!(!tx.has_address_table_lookups);
        // Fee payer is the first account key.
        assert_eq!(pubkey::encode(tx.fee_payer().unwrap()), PAYER);
        // Exactly one instruction (the SPL transfer_checked).
        assert_eq!(tx.instructions.len(), 1);
        assert_eq!(tx.instructions[0].data[0], 12, "TransferChecked opcode");
    }

    #[test]
    fn parses_memo_variant_with_two_instructions() {
        let tx = parse(&decode(TRANSFER_CHECKED_MEMO)).unwrap();
        assert_eq!(tx.instructions.len(), 2, "transfer + memo");
    }

    #[test]
    fn parses_plain_transfer_structure() {
        let tx = parse(&decode(PLAIN_TRANSFER)).unwrap();
        assert_eq!(tx.instructions.len(), 1);
        assert_eq!(tx.instructions[0].data[0], 3, "plain Transfer opcode");
    }

    #[test]
    fn rejects_truncated_input() {
        let mut bytes = decode(TRANSFER_CHECKED);
        bytes.truncate(bytes.len() - 10);
        assert!(parse(&bytes).is_err());
    }
}
