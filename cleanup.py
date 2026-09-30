import os
import re

files = [
    'corte2/clase08/diagrama-silos.qmd', 
    'corte2/clase08/paradigmas-hl7.qmd', 
    'corte2/clase08/diagrama-http.qmd'
]

btn_html = '\n  <button class="btn-zoom" onclick="this.parentElement.classList.toggle(\'fullscreen\')">🔍 Zoom</button>'

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            
        # Revert the corrupted button injections (removing anything that looks like the corrupted button)
        content = re.sub(r'`n\s*<button class="btn-zoom"[^>]*>\?\? Zoom</button>', '', content)
        content = re.sub(r'`n\s*<button class="btn-zoom"[^>]*>🔍 Zoom</button>', '', content)
        content = re.sub(r'\n\s*<button class="btn-zoom"[^>]*>.*?Zoom</button>', '', content)
        
        # Inject the button cleanly inside the main divs ONLY
        content = re.sub(r'(<div class="silos-viz diagram-zoomable"[^>]*>)', r'\1' + btn_html, content)
        content = re.sub(r'(<div class="silos-viz"[^>]*>)', r'<div class="silos-viz diagram-zoomable" \1' + btn_html, content)
        content = content.replace('<div class="silos-viz diagram-zoomable" <div class="silos-viz"', '<div class="silos-viz diagram-zoomable"')
        
        content = re.sub(r'(<div class="hl7-viz diagram-zoomable"[^>]*>)', r'\1' + btn_html, content)
        content = re.sub(r'(<div class="hl7-viz"[^>]*>)', r'<div class="hl7-viz diagram-zoomable" \1' + btn_html, content)
        content = content.replace('<div class="hl7-viz diagram-zoomable" <div class="hl7-viz"', '<div class="hl7-viz diagram-zoomable"')
        
        content = re.sub(r'(<div class="http-viz diagram-zoomable"[^>]*>)', r'\1' + btn_html, content)
        content = re.sub(r'(<div class="http-viz"[^>]*>)', r'<div class="http-viz diagram-zoomable" \1' + btn_html, content)
        content = content.replace('<div class="http-viz diagram-zoomable" <div class="http-viz"', '<div class="http-viz diagram-zoomable"')
        
        # Deduplicate buttons if they got added multiple times
        content = re.sub(r'(<button class="btn-zoom"[^>]*>🔍 Zoom</button>\s*)+', btn_html + '\n', content)
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print("Cleaned up", f)
    except Exception as e:
        print('Error on', f, e)
