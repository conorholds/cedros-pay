export function stripJsComments(text) {
  let output = '';
  let state = 'code';
  let regexInCharacterClass = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (state === 'line') {
      if (char === '\n') {
        output += char;
        state = 'code';
      }
      continue;
    }
    if (state === 'block') {
      if (char === '*' && next === '/') {
        index += 1;
        state = 'code';
      } else if (char === '\n') {
        output += char;
      }
      continue;
    }
    if (state === 'regex') {
      output += char;
      if (char === '\\') {
        index += 1;
        output += text[index] ?? '';
      } else if (char === '[') {
        regexInCharacterClass = true;
      } else if (char === ']') {
        regexInCharacterClass = false;
      } else if (char === '/' && !regexInCharacterClass) {
        state = 'code';
      }
      continue;
    }
    if (state === 'single' || state === 'double' || state === 'template') {
      output += char;
      if (char === '\\') {
        index += 1;
        output += text[index] ?? '';
      } else if (
        (state === 'single' && char === "'") ||
        (state === 'double' && char === '"') ||
        (state === 'template' && char === '`')
      ) {
        state = 'code';
      }
      continue;
    }
    if (char === '/' && next === '/') {
      index += 1;
      state = 'line';
    } else if (char === '/' && next === '*') {
      index += 1;
      state = 'block';
    } else {
      output += char;
      if (char === "'") state = 'single';
      else if (char === '"') state = 'double';
      else if (char === '`') state = 'template';
      else if (char === '/' && canStartRegexLiteral(output.slice(0, -1))) {
        state = 'regex';
        regexInCharacterClass = false;
      }
    }
  }
  return output;
}

function canStartRegexLiteral(textBeforeSlash) {
  const trimmed = textBeforeSlash.trimEnd();
  if (trimmed === '') return true;
  if (/[({[=,:;!&|?+*~^<>%-]$/.test(trimmed)) return true;
  const token = /(?:^|[^A-Za-z0-9_$])([A-Za-z_$][A-Za-z0-9_$]*)$/.exec(trimmed)?.[1];
  return /^(?:return|throw|case|delete|void|typeof|instanceof|new|in|of|yield|await|else|do)$/.test(token ?? '');
}

export function maskJsCommentsAndLiterals(source) {
  const masked = source.split('');

  const blank = (start, end) => {
    for (let index = start; index < end; index += 1) {
      if (masked[index] !== '\n' && masked[index] !== '\r') masked[index] = ' ';
    }
  };

  const scanQuoted = (start, quote) => {
    let escaped = false;
    for (let index = start + 1; index < source.length; index += 1) {
      const character = source[index];
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        blank(start, index + 1);
        return index + 1;
      }
    }
    blank(start, source.length);
    return source.length;
  };

  for (let index = 0; index < source.length;) {
    const character = source[index];
    const next = source[index + 1];
    if (character === "'" || character === '"' || character === '`') {
      index = scanQuoted(index, character);
      continue;
    }
    if (character === '/' && next === '/') {
      const end = source.indexOf('\n', index + 2);
      const nextIndex = end === -1 ? source.length : end;
      blank(index, nextIndex);
      index = nextIndex;
      continue;
    }
    if (character === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      const nextIndex = end === -1 ? source.length : end + 2;
      blank(index, nextIndex);
      index = nextIndex;
      continue;
    }
    index += 1;
  }

  return masked.join('');
}
