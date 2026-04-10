from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pygments import highlight
from pygments.formatters import ImageFormatter
from pygments.lexers import JavascriptLexer

if not hasattr(ImageDraw.ImageDraw, "textsize"):
    def _textsize(self, text, font=None, *args, **kwargs):
        bbox = self.textbbox((0, 0), text, font=font, *args, **kwargs)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]

    ImageDraw.ImageDraw.textsize = _textsize


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "exports" / "code-snippets"
FONT_PATHS = [
    Path("C:/Windows/Fonts/consola.ttf"),
    Path("C:/Windows/Fonts/Consolas.ttf"),
    Path("C:/Windows/Fonts/cour.ttf"),
]

SNIPPETS = [
    {
        "source": ROOT / "src" / "context" / "CartContext.jsx",
        "output": OUTPUT_DIR / "cart-context.png",
        "title": "Cart State Management",
        "subtitle": "src/context/CartContext.jsx",
        "start": 1,
        "end": 160,
    },
    {
        "source": ROOT / "src" / "context" / "UserAuthContext.jsx",
        "output": OUTPUT_DIR / "user-auth-context.png",
        "title": "Customer Session Context",
        "subtitle": "src/context/UserAuthContext.jsx",
        "start": 1,
        "end": 102,
    },
    {
        "source": ROOT / "server" / "controllers" / "authController.js",
        "output": OUTPUT_DIR / "customer-auth-controller.png",
        "title": "Customer Login and Registration API",
        "subtitle": "server/controllers/authController.js",
        "start": 107,
        "end": 175,
    },
    {
        "source": ROOT / "server" / "controllers" / "orderController.js",
        "output": OUTPUT_DIR / "order-processing-controller.png",
        "title": "Order Creation and Validation",
        "subtitle": "server/controllers/orderController.js",
        "start": 36,
        "end": 107,
    },
]


def get_font_path():
    for font_path in FONT_PATHS:
        if font_path.exists():
            return str(font_path)
    return None


def load_ui_font(size: int):
    for font_path in FONT_PATHS:
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size=size)
    return ImageFont.load_default()


def extract_lines(file_path: Path, start: int, end: int) -> str:
    lines = file_path.read_text(encoding="utf-8").splitlines()
    return "\n".join(lines[start - 1 : end])


def render_code_image(code: str) -> Image.Image:
    formatter = ImageFormatter(
        font_name=get_font_path() or "Courier New",
        font_size=22,
        line_numbers=True,
        line_number_bg="#0b1220",
        line_number_fg="#5f6f92",
        line_pad=8,
        image_pad=28,
        line_number_pad=18,
        style="monokai",
        bg="#111827",
    )
    rendered = highlight(code, JavascriptLexer(), formatter)
    return Image.open(BytesIO(rendered)).convert("RGBA")


def build_window_frame(code_image: Image.Image, title: str, subtitle: str) -> Image.Image:
    outer_padding = 36
    chrome_height = 82
    footer_height = 18
    width = code_image.width + outer_padding * 2
    height = code_image.height + outer_padding * 2 + chrome_height + footer_height

    canvas = Image.new("RGBA", (width, height), "#0a101c")
    draw = ImageDraw.Draw(canvas)

    shadow_offset = 14
    draw.rounded_rectangle(
        (
            outer_padding + shadow_offset,
            outer_padding + shadow_offset,
            width - outer_padding + shadow_offset - 2,
            height - outer_padding + shadow_offset - 2,
        ),
        radius=28,
        fill="#04070f",
    )

    window_bounds = (
        outer_padding,
        outer_padding,
        width - outer_padding,
        height - outer_padding - footer_height,
    )
    draw.rounded_rectangle(window_bounds, radius=28, fill="#111827", outline="#2b3548", width=2)
    draw.rounded_rectangle(
        (outer_padding, outer_padding, width - outer_padding, outer_padding + chrome_height),
        radius=28,
        fill="#0f172a",
    )
    draw.rectangle(
        (outer_padding, outer_padding + chrome_height - 28, width - outer_padding, outer_padding + chrome_height),
        fill="#0f172a",
    )

    circle_y = outer_padding + 28
    circle_x = outer_padding + 24
    for color in ("#ff5f57", "#febc2e", "#28c840"):
        draw.ellipse((circle_x, circle_y, circle_x + 16, circle_y + 16), fill=color)
        circle_x += 24

    title_font = load_ui_font(24)
    subtitle_font = load_ui_font(18)
    draw.text((outer_padding + 108, outer_padding + 16), title, font=title_font, fill="#f8fafc")
    draw.text((outer_padding + 108, outer_padding + 46), subtitle, font=subtitle_font, fill="#94a3b8")

    canvas.alpha_composite(code_image, (outer_padding, outer_padding + chrome_height))
    return canvas


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for snippet in SNIPPETS:
        code = extract_lines(snippet["source"], snippet["start"], snippet["end"])
        code_image = render_code_image(code)
        framed_image = build_window_frame(code_image, snippet["title"], snippet["subtitle"])
        framed_image.save(snippet["output"])
        print(snippet["output"])


if __name__ == "__main__":
    main()
