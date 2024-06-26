@echo off

set PYTHON=
set GIT=
set VENV_DIR=
set SAFETENSORS_FAST_GPU=1

REM pip install torch==2.1.0+cu118 torchvision --force-reinstall --index-url https://download.pytorch.org/whl/cu118
REM https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Optimizations

rem --no-half --upcast-sampling

set COMMANDLINE_ARGS=^
	--skip-version-check ^
	--skip-prepare-environment ^
	--disable-nan-check ^
	--disable-safe-unpickle ^
	--no-half-vae ^
	--opt-split-attention ^
	--opt-sub-quad-attention ^
	--upcast-sampling ^
	--opt-channelslast ^
	--xformers

call webui.bat