#!/usr/bin/env python3
"""Talli avatars: 24 flat civil servants (clerks, case workers, call centre agents) drawn as SVG, rendered to PNG.

Replaces the Greek-god busts (Joshua 2026-11-20: "government workers"). Drawn here, so there is no photo licence
and nobody gets a real stranger's face. Run on a Mac:  python3 scripts/gen_avatars.py
Writes web/avatars/<nn>-<role>.svg and .png (512 px, rendered by Quick Look's qlmanage).
"""
import os, random, subprocess, tempfile, shutil

OUT = os.path.join(os.path.dirname(__file__), '..', 'web', 'avatars')
S = 512

SKIN = ['#f6d3b3', '#e8b48f', '#c98e66', '#a86b45', '#7a4a2c', '#5a3520']
HAIR = ['#1f1b18', '#3b2a20', '#6b4a2b', '#a8743c', '#c9c4bd', '#8a8f98']
BG = ['#dbe8f5', '#cfe0f2', '#e4ecf5', '#d6e2ee', '#e9eef4', '#d0dceb']
SHIRT = ['#2f6fb0', '#3d4f66', '#5b9bd5', '#4a5568', '#2c3e50', '#6b7f99', '#e5e7eb', '#9fb3c8']
TIE = ['#b23a48', '#2f6fb0', '#1f2937', '#c08a2e', '#3f7d5a']

ROLES = ['intake-clerk', 'case-worker', 'benefits-officer', 'records-clerk', 'call-centre', 'tax-assessor',
         'front-counter', 'supervisor', 'eligibility-worker', 'file-room', 'notary', 'policy-analyst']


def head(skin, hair, style, glasses):
    cx, cy, r = 256, 210, 78
    p = []
    # hair behind the head (long styles)
    if style == 'long':
        p.append(f'<path d="M{cx-92} {cy+10} Q{cx-96} {cy-100} {cx} {cy-102} Q{cx+96} {cy-100} {cx+92} {cy+10} L{cx+92} {cy+120} L{cx-92} {cy+120} Z" fill="{hair}"/>')
    if style == 'bun':
        p.append(f'<circle cx="{cx}" cy="{cy-98}" r="34" fill="{hair}"/>')
    p.append(f'<rect x="{cx-22}" y="{cy+60}" width="44" height="40" fill="{skin}"/>')  # neck
    p.append(f'<circle cx="{cx-78}" cy="{cy+6}" r="14" fill="{skin}"/><circle cx="{cx+78}" cy="{cy+6}" r="14" fill="{skin}"/>')
    p.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{skin}"/>')
    # hair on top
    if style in ('short', 'long', 'bun'):
        p.append(f'<path d="M{cx-80} {cy-4} Q{cx-84} {cy-88} {cx} {cy-90} Q{cx+84} {cy-88} {cx+80} {cy-4} Q{cx+40} {cy-52} {cx-80} {cy-4} Z" fill="{hair}"/>')
    elif style == 'side':
        p.append(f'<path d="M{cx-80} {cy} Q{cx-80} {cy-90} {cx+10} {cy-88} Q{cx+86} {cy-80} {cx+80} {cy-10} Q{cx+20} {cy-60} {cx-40} {cy-46} Q{cx-66} {cy-30} {cx-80} {cy} Z" fill="{hair}"/>')
    elif style == 'curly':
        for i in range(9):
            a = -170 + i * 20
            import math
            x = cx + 74 * math.cos(math.radians(a)); y = cy - 8 + 74 * math.sin(math.radians(a))
            p.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="26" fill="{hair}"/>')
    elif style == 'bald':
        p.append(f'<path d="M{cx-80} {cy+4} Q{cx-84} {cy-30} {cx-70} {cy-36} L{cx-62} {cy+2} Z" fill="{hair}"/><path d="M{cx+80} {cy+4} Q{cx+84} {cy-30} {cx+70} {cy-36} L{cx+62} {cy+2} Z" fill="{hair}"/>')
    # face: calm, slightly tired, professional
    p.append(f'<circle cx="{cx-28}" cy="{cy+4}" r="6" fill="#1f2937"/><circle cx="{cx+28}" cy="{cy+4}" r="6" fill="#1f2937"/>')
    p.append(f'<path d="M{cx-40} {cy-18} L{cx-16} {cy-16}" stroke="{hair}" stroke-width="6" stroke-linecap="round"/><path d="M{cx+16} {cy-16} L{cx+40} {cy-18}" stroke="{hair}" stroke-width="6" stroke-linecap="round"/>')
    p.append(f'<path d="M{cx-18} {cy+38} Q{cx} {cy+46} {cx+18} {cy+38}" stroke="#7a3b2e" stroke-width="5" fill="none" stroke-linecap="round"/>')
    if glasses:
        p.append(f'<g fill="none" stroke="#1f2937" stroke-width="5"><rect x="{cx-50}" y="{cy-14}" width="40" height="32" rx="8"/><rect x="{cx+10}" y="{cy-14}" width="40" height="32" rx="8"/><path d="M{cx-10} {cy} L{cx+10} {cy}"/></g>')
    return ''.join(p)


def body(shirt, tie, neckwear):
    p = [f'<path d="M96 512 Q100 330 256 316 Q412 330 416 512 Z" fill="{shirt}"/>']
    # collar
    p.append('<path d="M222 318 L256 360 L290 318 L276 312 L256 336 L236 312 Z" fill="#f8fafc"/>')
    if neckwear == 'tie':
        p.append(f'<path d="M248 352 L264 352 L272 440 L256 462 L240 440 Z" fill="{tie}"/><path d="M246 340 L266 340 L262 356 L250 356 Z" fill="{tie}"/>')
    elif neckwear == 'lanyard':
        p.append('<path d="M226 322 L246 430 M286 322 L266 430" stroke="#2f6fb0" stroke-width="8" fill="none"/>')
        p.append('<rect x="226" y="428" width="60" height="76" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/><rect x="236" y="440" width="40" height="28" rx="4" fill="#cfe0f2"/><rect x="236" y="476" width="40" height="5" rx="2" fill="#94a3b8"/><rect x="236" y="486" width="28" height="5" rx="2" fill="#94a3b8"/>')
    elif neckwear == 'cardigan':
        p.append('<path d="M150 512 Q160 360 236 322 L256 512 Z" fill="#475569" opacity=".85"/><path d="M362 512 Q352 360 276 322 L256 512 Z" fill="#475569" opacity=".85"/>')
    return ''.join(p)


def prop(kind):
    if kind == 'stamp':
        return ('<g transform="translate(330 380) rotate(-12)"><rect x="0" y="40" width="120" height="44" rx="6" fill="none" stroke="#b23a48" stroke-width="6"/>'
                '<text x="60" y="71" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#b23a48" text-anchor="middle">APPROVED</text></g>')
    if kind == 'clipboard':
        return ('<g transform="translate(340 360) rotate(8)"><rect width="96" height="128" rx="8" fill="#a16207"/><rect x="10" y="16" width="76" height="104" rx="4" fill="#fff"/>'
                '<rect x="30" y="4" width="36" height="18" rx="4" fill="#94a3b8"/><rect x="20" y="36" width="56" height="5" fill="#94a3b8"/><rect x="20" y="52" width="48" height="5" fill="#94a3b8"/><rect x="20" y="68" width="56" height="5" fill="#94a3b8"/><path d="M22 92 l8 8 l16 -18" stroke="#3f7d5a" stroke-width="5" fill="none"/></g>')
    if kind == 'mug':
        return ('<g transform="translate(352 400)"><rect width="72" height="84" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="3"/><path d="M72 20 q28 0 28 22 q0 22 -28 22" stroke="#cbd5e1" stroke-width="8" fill="none"/>'
                '<text x="36" y="52" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="#2f6fb0" text-anchor="middle">#1</text></g>')
    if kind == 'headset':
        return ('<path d="M168 200 Q170 112 256 110 Q342 112 344 200" stroke="#1f2937" stroke-width="12" fill="none"/>'
                '<rect x="156" y="190" width="28" height="46" rx="10" fill="#1f2937"/><rect x="328" y="190" width="28" height="46" rx="10" fill="#1f2937"/><path d="M170 236 Q176 280 226 284" stroke="#1f2937" stroke-width="6" fill="none"/><circle cx="230" cy="284" r="8" fill="#1f2937"/>')
    if kind == 'folders':
        return ('<g transform="translate(60 392) rotate(-6)"><rect y="24" width="120" height="84" rx="6" fill="#e0b84f"/><rect y="12" width="120" height="84" rx="6" fill="#f0cf6b"/><rect width="120" height="84" rx="6" fill="#f6dc8a"/>'
                '<rect x="12" y="-10" width="40" height="16" rx="4" fill="#f6dc8a"/><text x="60" y="52" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#7c5a12" text-anchor="middle">FORM 7</text></g>')
    return ''


def avatar(i):
    r = random.Random(i * 7919 + 13)
    skin = SKIN[i % len(SKIN)]
    hair = r.choice(HAIR)
    style = ['short', 'side', 'bun', 'curly', 'long', 'bald'][(i * 5) % 6]
    glasses = r.random() < 0.45
    shirt = r.choice(SHIRT)
    neckwear = ['lanyard', 'tie', 'lanyard', 'cardigan', 'tie', 'lanyard'][(i * 7) % 6]
    kind = ['stamp', 'clipboard', 'mug', 'headset', 'folders', 'stamp', 'clipboard', 'mug'][i % 8]
    bg = BG[i % len(BG)]
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">'
           f'<rect width="{S}" height="{S}" fill="{bg}"/>'
           f'{body(shirt, r.choice(TIE), neckwear)}{head(skin, hair, style, glasses)}{prop(kind)}</svg>\n')
    return f'{i + 1:02d}-{ROLES[i % len(ROLES)]}', svg


def main():
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp()
    names = []
    for i in range(24):
        name, svg = avatar(i)
        names.append(name)
        with open(os.path.join(OUT, name + '.svg'), 'w') as f:
            f.write(svg)
        src = os.path.join(tmp, name + '.svg')
        shutil.copy(os.path.join(OUT, name + '.svg'), src)
        subprocess.run(['qlmanage', '-t', '-s', str(S), '-o', tmp, src], capture_output=True)
        shutil.move(os.path.join(tmp, name + '.svg.png'), os.path.join(OUT, name + '.png'))
    print('\n'.join(names))


if __name__ == '__main__':
    main()
