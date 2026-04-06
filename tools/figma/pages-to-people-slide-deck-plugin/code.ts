type AnyObj = { [k: string]: any };

const FIGMA_W = 1440;
const FIGMA_H = 810;

function hexToRgb(hex: string): RGB {
  const s = hex.trim().replace(/^#/, "");
  if (s.length !== 6) throw new Error(`Bad hex color: ${hex}`);
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function get(obj: AnyObj, key: string, fallback: any = undefined) {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : fallback;
}

function resolveColor(tokenOrHex: string, styles: AnyObj): Paint {
  if (!tokenOrHex) return { type: "SOLID", color: { r: 0, g: 0, b: 0 } };
  if (tokenOrHex.startsWith("#")) return { type: "SOLID", color: hexToRgb(tokenOrHex) };

  // gradient token -> approximate with first stop as SOLID
  const colors = get(get(get(styles, "colors", {}), tokenOrHex, {}), "colors", null);
  if (Array.isArray(colors) && colors.length > 0 && typeof colors[0] === "string") {
    return { type: "SOLID", color: hexToRgb(colors[0]) };
  }
  return { type: "SOLID", color: { r: 0, g: 0, b: 0 } };
}

async function loadTextStyleFonts(styleName: string | undefined, styles: AnyObj) {
  if (!styleName) return;
  const s = get(get(styles, "text", {}), styleName, null);
  const fontFamily = s?.fontFamily;
  // Font availability in Figma: these should exist, but load defensively
  if (typeof fontFamily === "string") {
    await figma.loadFontAsync({ family: fontFamily, style: "Regular" });
    await figma.loadFontAsync({ family: fontFamily, style: "Bold" }).catch(() => {});
    await figma.loadFontAsync({ family: fontFamily, style: "SemiBold" }).catch(() => {});
  }
}

function applyTextStyle(node: TextNode, styleName: string | undefined, styles: AnyObj) {
  if (!styleName) return;
  const s = get(get(styles, "text", {}), styleName, null);
  if (!s) return;

  if (typeof s.fontFamily === "string") {
    // Use Regular by default; we’ll approximate weight via fontName style where possible
    node.fontName = { family: s.fontFamily, style: "Regular" };
  }
  if (typeof s.fontSize === "number") node.fontSize = s.fontSize;
  if (typeof s.lineHeight === "number") node.lineHeight = { value: s.lineHeight, unit: "PIXELS" };
  if (typeof s.fontWeight === "number") {
    // Figma uses fontName style names; we’ll approximate: >=600 -> SemiBold/Bold
    const family = (node.fontName as FontName).family;
    const desired = s.fontWeight >= 700 ? "Bold" : s.fontWeight >= 600 ? "SemiBold" : "Regular";
    node.fontName = { family, style: desired };
  }
  if (typeof s.color === "string" && s.color.startsWith("#")) {
    node.fills = [{ type: "SOLID", color: hexToRgb(s.color) }];
  }
}

function findFrames(figmaJson: AnyObj): AnyObj[] {
  const document = get(figmaJson, "document", {});
  const children = get(document, "children", []) as AnyObj[];
  for (const child of children) {
    if (get(child, "type") === "CANVAS" && get(child, "name") === "Slides") {
      const c = get(child, "children", []) as AnyObj[];
      return c.filter((n) => get(n, "type") === "FRAME");
    }
  }
  return [];
}

function setFrameBackground(frameNode: FrameNode, frameJson: AnyObj, styles: AnyObj) {
  const bg = get(frameJson, "backgroundColor", null);
  if (typeof bg === "string") {
    frameNode.fills = [resolveColor(bg, styles)];
  } else {
    frameNode.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  }
}

function addRectangle(parent: FrameNode, node: AnyObj, styles: AnyObj) {
  const r = figma.createRectangle();
  r.x = Number(get(node, "x", 0));
  r.y = Number(get(node, "y", 0));
  r.resize(Number(get(node, "width", 100)), Number(get(node, "height", 100)));

  const corner = Number(get(node, "cornerRadius", 0) || 0);
  if (corner > 0) r.cornerRadius = corner;

  const fill = String(get(node, "fill", "#FFFFFF"));
  r.fills = [resolveColor(fill, styles)];

  // Shadow support (simple)
  if (get(node, "shadow", false) === true) {
    r.effects = [
      {
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.12 },
        offset: { x: 0, y: 6 },
        radius: 16,
        spread: 0,
        visible: true,
        blendMode: "NORMAL",
      },
    ];
  }

  parent.appendChild(r);
}

function addEllipse(parent: FrameNode, node: AnyObj, styles: AnyObj) {
  const e = figma.createEllipse();
  e.x = Number(get(node, "x", 0));
  e.y = Number(get(node, "y", 0));
  e.resize(Number(get(node, "width", 100)), Number(get(node, "height", 100)));

  e.fills = []; // transparent
  const stroke = String(get(node, "stroke", "#000000"));
  e.strokes = [resolveColor(stroke, styles)];
  e.strokeWeight = Number(get(node, "strokeWidth", 1));

  parent.appendChild(e);
}

function addText(parent: FrameNode, node: AnyObj, styles: AnyObj) {
  const t = figma.createText();
  t.x = Number(get(node, "x", 0));
  t.y = Number(get(node, "y", 0));

  // If width provided, constrain; otherwise let it autosize
  const w = get(node, "width", null);
  if (typeof w === "number") {
    t.resize(w, 10);
    t.textAutoResize = "HEIGHT";
  } else {
    t.textAutoResize = "WIDTH_AND_HEIGHT";
  }

  t.characters = String(get(node, "characters", ""));
  applyTextStyle(t, get(node, "style", undefined), styles);

  parent.appendChild(t);
}

async function importDeck(jsonText: string) {
  const figmaJson = JSON.parse(jsonText) as AnyObj;
  const styles = get(figmaJson, "styles", {}) || {};
  const frames = findFrames(figmaJson);
  if (!frames.length) throw new Error("No slides found (expected CANVAS named 'Slides' with FRAME children).");

  // Load fonts referenced by styles (best effort)
  const textStyles = get(styles, "text", {}) || {};
  const styleNames = Object.keys(textStyles);
  for (const name of styleNames) {
    await loadTextStyleFonts(name, styles).catch(() => {});
  }
  // Ensure default font is loadable too
  await figma.loadFontAsync({ family: "Inter", style: "Regular" }).catch(() => {});

  const page = figma.currentPage;
  const gap = 120;

  let cursorX = 0;
  let cursorY = 0;

  const nodesToSelect: SceneNode[] = [];

  for (const slideJson of frames) {
    const frameNode = figma.createFrame();
    frameNode.name = String(get(slideJson, "name", "Slide"));
    frameNode.resize(FIGMA_W, FIGMA_H);
    frameNode.x = cursorX;
    frameNode.y = cursorY;
    setFrameBackground(frameNode, slideJson, styles);

    page.appendChild(frameNode);

    const children = (get(slideJson, "children", []) as AnyObj[]) || [];
    for (const child of children) {
      const type = get(child, "type");
      if (type === "RECTANGLE") addRectangle(frameNode, child, styles);
      else if (type === "ELLIPSE") addEllipse(frameNode, child, styles);
      else if (type === "TEXT") addText(frameNode, child, styles);
    }

    nodesToSelect.push(frameNode);
    cursorY += FIGMA_H + gap;
  }

  figma.currentPage.selection = nodesToSelect;
  figma.viewport.scrollAndZoomIntoView(nodesToSelect);
}

figma.showUI(__html__, { width: 520, height: 380 });

// Preload JSON if present in repo (optional workflow: user can paste too)
figma.ui.postMessage({ type: "SET_JSON", json: "" });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "CANCEL") {
    figma.closePlugin();
    return;
  }
  if (msg.type === "IMPORT_JSON") {
    try {
      await importDeck(String(msg.json || ""));
      figma.closePlugin("Imported slide deck.");
    } catch (e: any) {
      figma.notify(`Import failed: ${e?.message || String(e)}`, { error: true });
    }
  }
};

