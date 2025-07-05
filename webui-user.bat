@echo off

set PYTHON=
set GIT=
set VENV_DIR=
set SAFETENSORS_FAST_GPU=1

:: remove /venv/ folder
:: pip install -r requirements.txt
:: pip install numpy==1.26.4
:: pip install xformers
:: pip install xformers --index-url https://download.pytorch.org/whl/cu126
:: pip install torch==2.7.0+cu126 torchvision --force-reinstall --index-url https://download.pytorch.org/whl/cu126
:: pip install torch==2.7.0+cu118 torchvision --force-reinstall --index-url https://download.pytorch.org/whl/cu118

:: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Optimizations
:: --no-half --upcast-sampling

::  set COMMANDLINE_ARGS=^
::  	--skip-version-check ^
::  	--skip-prepare-environment ^
::  	--disable-safe-unpickle ^
::  	--disable-nan-check ^
::  	--no-half-vae ^
::  	--opt-split-attention ^
::      --opt-sdp-attention ^
::  	--opt-sdp-no-mem-attention ^
::  	--opt-sub-quad-attention ^
::  	--opt-channelslast ^
::  	--upcast-sampling ^
::  	--xformers

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
