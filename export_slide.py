import sys
import os

try:
    import win32com.client
except ImportError:
    print("pywin32 not installed")
    sys.exit(1)

def export_slide(pptx_path, slide_index, output_path):
    try:
        powerpoint = win32com.client.Dispatch("PowerPoint.Application")
        # Ensure it's absolute path
        abs_pptx = os.path.abspath(pptx_path)
        abs_out = os.path.abspath(output_path)
        
        presentation = powerpoint.Presentations.Open(abs_pptx, WithWindow=False)
        # slide_index is 1-based in VBA
        slide = presentation.Slides(slide_index)
        slide.Export(abs_out, "PNG")
        presentation.Close()
        # powerpoint.Quit() # Don't quit, might close user's other PPTs
        print("Exported successfully.")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 3:
        export_slide(sys.argv[1], int(sys.argv[2]), sys.argv[3])
