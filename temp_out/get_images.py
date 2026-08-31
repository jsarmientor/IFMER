import zipfile, re, os, glob

with zipfile.ZipFile('corte1/clase04/Sesion 6.pptx', 'r') as z:
    z.extractall('temp_pptx')

for i in range(1, 20):
    rel_file = f'temp_pptx/ppt/slides/_rels/slide{i}.xml.rels'
    if os.path.exists(rel_file):
        with open(rel_file, 'r', encoding='utf-8') as f:
            content = f.read()
            images = re.findall(r'Target=\"\.\./media/(image\d+\.\w+)\"', content)
            print(f'Slide {i}: {images}')
