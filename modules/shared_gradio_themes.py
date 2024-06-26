import os

import gradio as gr

from modules import errors, shared
from modules.paths_internal import script_path


# https://huggingface.co/datasets/freddyaboulton/gradio-theme-subdomains/resolve/main/subdomains.json
gradio_hf_hub_themes = [
    "gradio/base",
    "Medguy/base2",
    "abidlabs/Lime",
    "victorrauwcc/RCC",
    "Ama434/neutral-barlow",
    "reilnuud/polite",
    "aliabid94/new-theme",
]


def reload_gradio_theme(theme_name=None):
    if not theme_name:
        theme_name = shared.opts.gradio_theme

    default_theme_args = dict(
        font=["Noto Sans", "Source Sans Pro", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        font_mono=['IBM Plex Mono', 'ui-monospace', 'Consolas', 'monospace'],
    )

    if theme_name == "Default":
        shared.gradio_theme = gr.themes.Default(**default_theme_args)
    else:
        try:
            theme_cache_dir = os.path.join(script_path, 'tmp', 'gradio_themes')
            theme_cache_path = os.path.join(theme_cache_dir, f'{theme_name.replace("/", "_")}.json')
            if shared.opts.gradio_themes_cache and os.path.exists(theme_cache_path):
                shared.gradio_theme = gr.themes.ThemeClass.load(theme_cache_path)
            else:
                os.makedirs(theme_cache_dir, exist_ok=True)
                shared.gradio_theme = gr.themes.ThemeClass.from_hub(theme_name)
                shared.gradio_theme.dump(theme_cache_path)
        except Exception as e:
            errors.display(e, "changing gradio theme")
            shared.gradio_theme = gr.themes.Default(**default_theme_args)

    # append additional values gradio_theme
    shared.gradio_theme.sd_webui_modal_lightbox_toolbar_opacity = shared.opts.sd_webui_modal_lightbox_toolbar_opacity
    shared.gradio_theme.sd_webui_modal_lightbox_icon_opacity = shared.opts.sd_webui_modal_lightbox_icon_opacity
