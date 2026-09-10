"""Import book content, using TAB for physical positions and music for durations/rests.
Generated JSON is committed; this script is only needed when bass.tex changes.
"""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'bass.tex').read_text()
def clean(t):
    for a,b in [(r'\flat','b'),(r'\sharp','#'),(r'\#','#'),('$',''),(r'\quad',' '),(r'\textbf',''),('---','—'),('--','–'),(r'\&','&')]:t=t.replace(a,b)
    t=re.sub(r'\\(?:pageref|label)\{[^}]*\}','',t)
    return re.sub(r'\s+',' ',t.replace('{','').replace('}','')).strip()
def field(b,key):
    m=re.search(re.escape(key)+r'\s*&\s*(.*?)\\\\',b,re.S)
    return clean(m.group(1)) if m else ''
def blocks(kind):
    ms=list(re.finditer(r'\\'+kind+r'\{([^}]+)\}',s))
    return [(m.group(1),s[m.end():ms[i+1].start() if i+1<len(ms) else len(s)]) for i,m in enumerate(ms)]
def tab_positions(b):
    tabs=[]
    for d in re.findall(r'\\begin\{tikzpicture\}.*?\\end\{tikzpicture\}',b,re.S):
        if 'Bass TAB' in d:pass
        if 'y=0.50cm' in d:
            for x,y,f in re.findall(r'\\node\[fill=white,inner sep=1\.0pt[^\n]*?at \(([\d.]+),([0-3])\) \{(\d+)\}',d):
                tabs.append({'string':'EADG'[int(y)],'fret':int(f)})
        for x,y,f in re.findall(r'\\TabNum\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}',d):
            tabs.append({'string':'EADG'[int(y)],'fret':int(f)})
    return tabs
scales=[]
ids=['major','natural-minor','dorian','phrygian','lydian','mixolydian','locrian','harmonic-minor','melodic-minor','major-pentatonic','minor-pentatonic','blues']
for title,b in blocks('section'):
    if 'D example &' not in b:continue
    formula=field(b,'Formula').split()
    scales.append({'id':ids[len(scales)],'name':title.replace(' (Ionian)','').replace(' (Aeolian)','').replace(' scale',''),'degreeLabels':formula,'stepPattern':field(b,'Step pattern').replace('–',' ').split(),'signature':field(b,'Signature sound'),'applications':field(b,'Harmonic fit'),'description':field(b,'Overall colour'),'comparison':field(b,'Comparison'),'fingering':[dict(p,degree=(formula+['1'])[i],duration='q') for i,p in enumerate(tab_positions(b))]})
exercises=[]
for title,b in blocks('subsection'):
    m=re.match(r'([PM])(\d+) - (.*)',title)
    if not m:continue
    cat,num,title=m.groups(); num=int(num)
    tempo=re.search(r'Quarter note = (\d+)--(\d+) bpm; (.*?)\.',b)
    instructions=clean(re.search(r'\\textbf\{Play:\}\s*(.*?)\n',b).group(1))
    positions=iter(tab_positions(b));events=[]
    for music in re.findall(r'\\begin\{music\}.*?\\end\{music\}',b,re.S):
        for cmd in re.findall(r'\\(?:cu\{[^}]+\}|qu\{[^}]+\}|ds\b)',music):
            if cmd==r'\ds':events.append({'rest':True,'duration':'8'})
            else:events.append(dict(next(positions),duration='q' if cmd.startswith(r'\qu') else '8'))
    assert next(positions,None) is None,title
    text=(title+' '+instructions+' '+field(b,'Target')).lower()
    tags=['Technique' if cat=='P' else 'Musical']
    for tag,keys in {'Muting':['mut','silent','silence'],'Shifting':['shift','position','diagonal'],'Rhythm':['pulse','syncop','groove','rhythm','latin','repeated'],'Scale':['scale','pentatonic','blues'],'Arpeggio':['triad','arpeggio','chord chain'],'Chord tones':['third','fifth','chord','octave'],'Improvisation':['approach','enclosure','phrase','pedal'],'Latin / Salsa':['latin'],'Fretboard':['scale','octave','fret','string']}.items():
        if any(k in text for k in keys):tags.append(tag)
    exercises.append({'id':f'{cat}{num}','number':num,'globalNumber':num+(20 if cat=='M' else 0),'category':'physical' if cat=='P' else 'musical','title':title,'startBpm':int(tempo[1]),'targetBpm':int(tempo[2]),'rhythm':clean(tempo[3]),'instructions':instructions,'target':field(b,'Target'),'progression':field(b,'Progression'),'tags':tags,'baseRoot':'C' if cat=='M' and num in [12,20] else 'D','events':events})
programs=[]
programIds=['clean-restart','fretting-hand-control','right-hand-muting','shifting-register','major-foundation','minor-foundation','chord-tones-voice-leading','groove-syncopation','salsa-latin','improvisation-preparation']
for box in re.findall(r'\\begin\{tcolorbox\}.*?\\end\{tcolorbox\}',s,re.S):
    title=re.search(r'Program (\d+) - ([^}]+)',box)
    if not title:continue
    bs=[]
    for line in box.splitlines():
        m=re.match(r'(\d+)--(\d+) & (P\d+|M\d+|Song drill)(.*?) & (.*?) \\\\',line)
        if m:bs.append({'exerciseId':m[3] if m[3]!='Song drill' else 'song','purpose':clean(m[5])})
    assert len(bs)==6,(title.group(),bs)
    programs.append({'id':programIds[len(programs)],'number':int(title[1]),'name':title[2].capitalize(),'blocks':bs})
assert len(scales)==12 and len(exercises)==40 and len(programs)==10
(ROOT/'src/data/book.json').write_text(json.dumps({'scales':scales,'exercises':exercises,'programs':programs},indent=2)+'\n')
print(f'Imported {len(scales)} scales, {len(exercises)} exercises, {len(programs)} programs.')
for e in exercises:print(e['id'],e['title'],':',' '.join('rest' if n.get('rest') else n['string']+str(n['fret']) for n in e['events']))
