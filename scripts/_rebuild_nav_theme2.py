import io

p = 'assets/theme.css'
lines = io.open(p, encoding='utf-8').read().replace('\r\n', '\n').split('\n')

# Start: first exact `.site-nav {` line (start of nav region).
start_i = None
for i, l in enumerate(lines):
    if l.strip() == '.site-nav {' and start_i is None:
        start_i = i
        break
if start_i is None:
    raise SystemExit('start anchor .site-nav { not found')

# End: the standalone `.mob-ext-icon { flex: none; ... }` that comes immediately
# before the "5. PAGE HERO" section comment.
page_hero_i = None
for i, l in enumerate(lines):
    if '5. PAGE HERO' in l:
        page_hero_i = i
        break
if page_hero_i is None:
    raise SystemExit('PAGE HERO anchor not found')

end_i = None
for i in range(page_hero_i - 1, start_i, -1):
    if '.mob-ext-icon' in lines[i] and 'flex: none' in lines[i]:
        end_i = i
        break
if end_i is None:
    raise SystemExit('end anchor mob-ext-icon not found')

print('start idx', start_i, '->', repr(lines[start_i]))
print('end   idx', end_i, '->', repr(lines[end_i]))
print('PAGE HERO idx', page_hero_i, '->', repr(lines[page_hero_i]))

new_block = io.open('scripts/_nav_light_block.css', encoding='utf-8').read().replace('\r\n', '\n')
new_lines = new_block.split('\n')

lines[start_i:end_i + 1] = new_lines
out = '\n'.join(lines)
io.open(p, 'w', encoding='utf-8', newline='').write(out)
print('theme.css nav rebuilt; total lines', len(lines))
