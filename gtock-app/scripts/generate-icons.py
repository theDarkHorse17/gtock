from PIL import Image, ImageDraw

DARK = (10, 10, 10)
STROKE = (39, 39, 39)
WHITE = (250, 250, 250)

def make_icon(size, maskable=False):
    pad = int(size * 0.1) if maskable else 0
    canvas = size - pad * 2
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background rounded square
    draw.rounded_rectangle(
        (pad, pad, size - pad, size - pad),
        radius=int(canvas * 0.26),
        fill=DARK,
        outline=STROKE,
        width=max(1, int(canvas * 0.02))
    )

    # Play triangle
    cx = size // 2 + int(canvas * 0.03)
    cy = size // 2
    top = (cx + int(canvas * 0.18), cy - int(canvas * 0.175))
    bottom = (cx + int(canvas * 0.18), cy + int(canvas * 0.175))
    left = (cx - int(canvas * 0.22), cy)
    draw.polygon([top, bottom, left], fill=WHITE)

    # Curved stroke on left
    stroke_w = max(2, int(canvas * 0.055))
    arc_box = [
        pad + int(canvas * 0.18),
        pad + int(canvas * 0.28),
        pad + int(canvas * 0.52),
        pad + int(canvas * 0.72)
    ]
    draw.arc(arc_box, start=120, end=240, fill=WHITE, width=stroke_w)

    return img

for name, size, mask in [
    ("apple-touch-icon", 180, False),
    ("pwa-192x192", 192, False),
    ("pwa-512x512", 512, False),
    ("maskable-icon", 512, True)
]:
    make_icon(size, mask).save(f"/Users/dibyendumondal/Unicorns/gtock/gtock-app/public/{name}.png", "PNG")
    print(f"Generated {name}.png")
