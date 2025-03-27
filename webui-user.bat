@echo off

set PYTHON=
set GIT=
set VENV_DIR=
set SAFETENSORS_FAST_GPU=1

rem pip install torch==2.1.0+cu118 torchvision --force-reinstall --index-url https://download.pytorch.org/whl/cu118
rem https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Optimizations

rem --no-half --upcast-sampling

rem set COMMANDLINE_ARGS=^
rem 	--skip-version-check ^
rem 	--skip-prepare-environment ^
rem 	--disable-safe-unpickle ^
rem 	--disable-nan-check ^
rem 	--no-half-vae ^
rem 	--opt-split-attention ^
rem     --opt-sdp-attention ^
rem 	--opt-sdp-no-mem-attention ^
rem 	--opt-sub-quad-attention ^
rem 	--opt-channelslast ^
rem 	--upcast-sampling ^
rem 	--xformers

set COMMANDLINE_ARGS=^
	--skip-version-check ^
	--skip-prepare-environment ^
	--disable-nan-check ^
	--disable-safe-unpickle ^
	--opt-split-attention ^
	--opt-sdp-attention ^
	--opt-channelslast ^
	--xformers

call webui.bat