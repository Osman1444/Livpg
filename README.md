# Livpg

**Pages that do more than a PDF.**

Livpg is a visual page editor for creating documents with rich text, images, video, drawings, and interactive HTML. Export your work as one HTML file that readers can open in a browser, navigate like a PDF, and print.

**Live app URL:** <!-- Add the published project URL here. -->

[GitHub](https://github.com/osman1444/livpg) · [Report a bug](https://github.com/osman1444/livpg/issues)

## What you can make

Create interactive lessons, presentations, illustrated notes, portfolios, worksheets, and other page-based documents. Mix familiar document content with working calculators, quizzes, experiments, and other HTML widgets.

## Features

- **Flexible page sizes:** A4, A5, Letter, Legal, portrait, landscape, screen ratios, and custom dimensions.
- **Rich text:** edit directly on the page, with fonts, colors, highlighting, lists, alignment, and right-to-left text support.
- **Images and video:** add local files or links, including GIFs, SVGs, and YouTube videos. Replace images without losing their layout.
- **Shapes and drawing:** insert basic shapes or draw freehand, with pressure-sensitive strokes on supported pens.
- **Page backgrounds:** choose a color or image for one page or all pages.
- **Layout tools:** align elements, distribute spacing, and use a customizable grid with optional snapping.
- **Margin controls:** block content at the margins, hide the parts outside them, or use margins as guides only.
- **Multi-selection:** move, duplicate, delete, and reorder layers together.
- **Undo and redo:** recover edits during your session.
- **Paste and drop:** add supported text and files directly to the workspace.
- **Page reordering:** drag page tabs or use the move arrows.
- **Local recovery:** automatically save the current project in your browser and restore it after a refresh.
- **Standalone export:** share one HTML file with embedded project data so it can be reopened and edited in Livpg.
- **Desktop and phone previews**, plus light and dark editor themes.

## Get started

Download the repository, or clone it:

```bash
git clone https://github.com/osman1444/livpg.git
cd livpg
```

Open **index.html** in a modern browser. No installation, build step, or server is required.

1. Choose a page size and select **Create**, or open a previously exported Livpg file.
2. Add content from the dock. Drag elements to move them and use the handles to resize them.
3. Open **Properties** to change appearance, **Layout** for alignment and margins, or **Background** to style the page.
4. Check the desktop or phone preview.
5. Select **Export** to save your document as an HTML file.

## Editing tips

| Action | How |
| --- | --- |
| Edit text | Double-click a text box; press Escape or click outside to finish. |
| Select several elements | Shift/Ctrl/Cmd-click, or use the multi-select toolbar button. |
| Select all page elements | Ctrl/Cmd+A outside a text field. |
| Undo / redo | Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z, or the toolbar buttons. |
| Delete selected elements | Delete or Backspace outside a text field. |
| Temporarily bypass grid snapping | Hold Alt while dragging. |
| Reorder pages | Drag desktop page tabs, or use the earlier/later arrows beside them. |
| Finish drawing | Select **Done drawing**, click **Draw** again, or press Escape. |

## Interactive HTML blocks

Add an **HTML** element to include your own interactive content. The built-in AI helper can prepare a prompt for a quiz, chart, calculator, experiment, or another widget.

Enter what you want, optionally describe a style, and copy the prompt into your preferred AI. The helper recommends Gemini or Claude based on the creator's testing. Paste the generated HTML back into Livpg; raw HTML and complete HTML code blocks are accepted.

The default request uses a modern light theme and lets the AI choose a usable size. You can keep the current dimensions instead, or select **Use suggested size** after pasting the result. Test the widget's behavior and appearance before sharing it.

## Saving and sharing

Browser autosave keeps the current project on that browser and device. **Export HTML** gives you a portable copy to keep or share. Open that exported file in Livpg to continue editing it.

Locally selected images, video, and background images are embedded in the export. Linked content still needs its source to remain available. Large embedded videos can make the exported file large.

YouTube playback depends on how the document is opened: local files show a thumbnail link, while documents served over HTTP(S) use an embedded player. HTML widgets run in isolated frames. Text uses fonts available on the reader's device; custom fonts are not embedded.

## Feedback and contributions

Found a problem or have an idea? [Open an issue](https://github.com/osman1444/livpg/issues). Pull requests are welcome.

Created by [osman1444](https://github.com/osman1444).

## License

[MIT](LICENSE).
