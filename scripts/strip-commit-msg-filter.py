#!/usr/bin/env python3
"""
Reads a commit message from stdin and writes it to stdout with any
"Co-authored-by: ... cursoragent/Cursor ..." lines removed.
For use with: git filter-branch -f --msg-filter "python scripts/strip-commit-msg-filter.py" -- --all
"""
import sys

def main():
    data = sys.stdin.buffer.read()
    lines = data.split(b'\n')
    out = []
    for line in lines:
        lower = line.lower()
        if b'co-authored-by' in lower and (b'cursoragent' in lower or b'cursor' in line):
            continue
        out.append(line)
    sys.stdout.buffer.write(b'\n'.join(out))

if __name__ == '__main__':
    main()
