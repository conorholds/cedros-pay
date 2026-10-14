/** Preserve offsets/newlines while masking Rust comments and string/character literals. */
export function maskRustNonCode(text) {
  let output = '';
  let index = 0;
  const mask = (end) => {
    output += text.slice(index, end).replace(/[^\n\r]/g, ' ');
    index = end;
  };
  while (index < text.length) {
    if (text.startsWith('//', index)) {
      const end = text.indexOf('\n', index);
      mask(end < 0 ? text.length : end);
    } else if (text.startsWith('/*', index)) {
      let depth = 1;
      let end = index + 2;
      while (end < text.length && depth > 0) {
        if (text.startsWith('/*', end)) { depth += 1; end += 2; }
        else if (text.startsWith('*/', end)) { depth -= 1; end += 2; }
        else end += 1;
      }
      mask(end);
    } else {
      const raw = /^(?:br|cr|r)(#*)"/.exec(text.slice(index));
      if (raw) {
        const delimiter = `"${raw[1]}`;
        const end = text.indexOf(delimiter, index + raw[0].length);
        mask(end < 0 ? text.length : end + delimiter.length);
      } else if (text[index] === '"') {
        let end = index + 1;
        while (end < text.length) {
          if (text[end] === '\\') end += 2;
          else if (text[end++] === '"') break;
        }
        mask(Math.min(end, text.length));
      } else {
        // Lifetimes such as 'a are code, while '\n', '\u{41}', and 'a' are literals.
        const character = /^'(?:\\(?:u\{[0-9a-fA-F_]+\}|x[0-9a-fA-F]{2}|.)|[^'\\\r\n])'/u.exec(text.slice(index));
        if (character) mask(index + character[0].length);
        else output += text[index++];
      }
    }
  }
  return output;
}
