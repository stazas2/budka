// Для удобства создадим общий шаблон функций обновления отображения для каждого параметра.
// Каждому параметру - свой набор переменных all/current/max и функция updateDisplay

// Для удобства сделаем хранилище в виде объектов:
const paramData = {
    imageQuality: { all: null, current: null, max: null, containerId: 'imageQualityValuesContainer', selectId: 'imageQualitySelect' },
    aeMode: { all: null, current: null, max: null, containerId: 'aeModeValuesContainer', selectId: 'aeModeSelect' },
    aspect: { all: null, current: null, max: null, containerId: 'aspectValuesContainer', selectId: 'aspectSelect' },
    avMode: { all: null, current: null, max: null, containerId: 'avModeValuesContainer', selectId: 'avModeSelect' },
    dcStrobe: { all: null, current: null, max: null, containerId: 'dcStrobeValuesContainer', selectId: 'dcStrobeSelect' },
    driveMode: { all: null, current: null, max: null, containerId: 'driveModeValuesContainer', selectId: 'driveModeSelect' },
    exposureCompensation: { all: null, current: null, max: null, containerId: 'exposureCompensationValuesContainer', selectId: 'exposureCompensationSelect' },
    iso: { all: null, current: null, max: null, containerId: 'isoValuesContainer', selectId: 'isoSelect' },
    meteringMode: { all: null, current: null, max: null, containerId: 'meteringModeValuesContainer', selectId: 'meteringModeSelect' },
    movieHfr: { all: null, current: null, max: null, containerId: 'movieHfrValuesContainer', selectId: 'movieHfrSelect' },
    movieQuality: { all: null, current: null, max: null, containerId: 'movieQualityValuesContainer', selectId: 'movieQualitySelect' },
    pictureStyle: { all: null, current: null, max: null, containerId: 'pictureStyleValuesContainer', selectId: 'pictureStyleSelect' },
    tv: { all: null, current: null, max: null, containerId: 'tvValuesContainer', selectId: 'tvSelect' },
    whiteBalance: { all: null, current: null, max: null, containerId: 'whiteBalanceValuesContainer', selectId: 'whiteBalanceSelect' }
};

function updateDisplay(paramName) {
    const p = paramData[paramName];
    const container = document.getElementById(p.containerId);
    let displayText = '';
    if (p.all) {
        displayText += 'Все значения:\n' + JSON.stringify(p.all, null, 2) + '\n\n';
    }
    if (p.current !== null) {
        displayText += 'Текущее значение: ' + p.current + '\n\n';
    }
    if (p.max !== null) {
        displayText += 'Максимальное значение: ' + p.max + '\n\n';
    }
    container.textContent = displayText.trim();
    container.style.display = displayText ? 'block' : 'none';
}

// Общие функции для получения/установки значений
async function loadAllValues(paramName, endpoint) {
    const p = paramData[paramName];
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        p.all = data;

        // Заполнение селекта
        const select = document.getElementById(p.selectId);
        select.innerHTML = '';
        Object.entries(data).forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        });

        updateDisplay(paramName);
    } catch (error) { console.error(error); }
}

async function loadCurrentValue(paramName, endpoint) {
    const p = paramData[paramName];
    try {
        const response = await fetch(endpoint);
        const current = await response.text();
        p.current = current;
        updateDisplay(paramName);
    } catch (error) { console.error(error); }
}

async function loadMaxValue(paramName, endpoint) {
    const p = paramData[paramName];
    try {
        const response = await fetch(endpoint);
        const maxVal = await response.json();
        p.max = JSON.stringify(maxVal);
        updateDisplay(paramName);
    } catch (error) { console.error(error); }
}

async function setValue(paramName, endpointBase) {
    const p = paramData[paramName];
    const select = document.getElementById(p.selectId);
    const value = select.value;
    try {
        await fetch(`${endpointBase}/${value}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: parseInt(value) })
        });
        const responseDiv = document.getElementById(paramName + 'PostResponse');
        responseDiv.textContent = 'Значение установлено';
        responseDiv.style.display = 'block';
    } catch (error) { console.error(error); }
}

// Теперь для каждого параметра вызываем нужные функции

// Image Quality
function loadImageQualityData() { loadAllValues('imageQuality', '/api/get/image-quality'); }
function loadImageQualityCurrent() { loadCurrentValue('imageQuality', '/api/get/image-quality/current'); }
function loadImageQualityMax() { loadMaxValue('imageQuality', '/api/get/image-quality/max'); }
function setImageQuality() { setValue('imageQuality', '/api/post/image-quality'); }

// AE Mode
function loadAeModeData() { loadAllValues('aeMode', '/api/get/ae-mode'); }
function loadAeModeCurrent() { loadCurrentValue('aeMode', '/api/get/ae-mode/current'); }
function loadAeModeMax() { loadMaxValue('aeMode', '/api/get/ae-mode/max'); }
function setAeMode() { setValue('aeMode', '/api/post/ae-mode'); }

// Aspect
function loadAspectData() { loadAllValues('aspect', '/api/get/aspect'); }
function loadAspectCurrent() { loadCurrentValue('aspect', '/api/get/aspect/current'); }
function loadAspectMax() { loadMaxValue('aspect', '/api/get/aspect/max'); }
function setAspect() { setValue('aspect', '/api/post/aspect'); }

// Av Mode
function loadAvModeData() { loadAllValues('avMode', '/api/get/av-mode'); }
function loadAvModeCurrent() { loadCurrentValue('avMode', '/api/get/av-mode/current'); }
function loadAvModeMax() { loadMaxValue('avMode', '/api/get/av-mode/max'); }
function setAvMode() { setValue('avMode', '/api/post/av-mode'); }

// DC Strobe
function loadDcStrobeData() { loadAllValues('dcStrobe', '/api/get/dc-strobe'); }
function loadDcStrobeCurrent() { loadCurrentValue('dcStrobe', '/api/get/dc-strobe/current'); }
function loadDcStrobeMax() { loadMaxValue('dcStrobe', '/api/get/dc-strobe/max'); }
function setDcStrobe() { setValue('dcStrobe', '/api/post/dc-strobe'); }

// Drive Mode
function loadDriveModeData() { loadAllValues('driveMode', '/api/get/drive-mode'); }
function loadDriveModeCurrent() { loadCurrentValue('driveMode', '/api/get/drive-mode/current'); }
function loadDriveModeMax() { loadMaxValue('driveMode', '/api/get/drive-mode/max'); }
function setDriveMode() { setValue('driveMode', '/api/post/drive-mode'); }

// Exposure Compensation
function loadExposureCompensationData() { loadAllValues('exposureCompensation', '/api/get/exposure-compensation'); }
function loadExposureCompensationCurrent() { loadCurrentValue('exposureCompensation', '/api/get/exposure-compensation/current'); }
function loadExposureCompensationMax() { loadMaxValue('exposureCompensation', '/api/get/exposure-compensation/max'); }
function setExposureCompensation() { setValue('exposureCompensation', '/api/post/exposure-compensation'); }

// ISO
function loadIsoData() { loadAllValues('iso', '/api/get/iso'); }
function loadIsoCurrent() { loadCurrentValue('iso', '/api/get/iso/current'); }
function loadIsoMax() { loadMaxValue('iso', '/api/get/iso/max'); }
function setIso() { setValue('iso', '/api/post/iso'); }

// Metering Mode
function loadMeteringModeData() { loadAllValues('meteringMode', '/api/get/metering-mode'); }
function loadMeteringModeCurrent() { loadCurrentValue('meteringMode', '/api/get/metering-mode/current'); }
function loadMeteringModeMax() { loadMaxValue('meteringMode', '/api/get/metering-mode/max'); }
function setMeteringMode() { setValue('meteringMode', '/api/post/metering-mode'); }

// Movie HFR
function loadMovieHfrData() { loadAllValues('movieHfr', '/api/get/movie-hfr'); }
function loadMovieHfrCurrent() { loadCurrentValue('movieHfr', '/api/get/movie-hfr/current'); }
function loadMovieHfrMax() { loadMaxValue('movieHfr', '/api/get/movie-hfr/max'); }
function setMovieHfr() { setValue('movieHfr', '/api/post/movie-hfr'); }

// Movie Quality
function loadMovieQualityData() { loadAllValues('movieQuality', '/api/get/movie-quality'); }
function loadMovieQualityCurrent() { loadCurrentValue('movieQuality', '/api/get/movie-quality/current'); }
function loadMovieQualityMax() { loadMaxValue('movieQuality', '/api/get/movie-quality/max'); }
function setMovieQuality() { setValue('movieQuality', '/api/post/movie-quality'); }

// Picture Style
function loadPictureStyleData() { loadAllValues('pictureStyle', '/api/get/picture-style'); }
function loadPictureStyleCurrent() { loadCurrentValue('pictureStyle', '/api/get/picture-style/current'); }
function loadPictureStyleMax() { loadMaxValue('pictureStyle', '/api/get/picture-style/max'); }
function setPictureStyle() { setValue('pictureStyle', '/api/post/picture-style'); }

// Tv
function loadTvData() { loadAllValues('tv', '/api/get/tv'); }
function loadTvCurrent() { loadCurrentValue('tv', '/api/get/tv/current'); }
function loadTvMax() { loadMaxValue('tv', '/api/get/tv/max'); }
function setTv() { setValue('tv', '/api/post/tv'); }

// White Balance
function loadWhiteBalanceData() { loadAllValues('whiteBalance', '/api/get/white-balance'); }
function loadWhiteBalanceCurrent() { loadCurrentValue('whiteBalance', '/api/get/white-balance/current'); }
function loadWhiteBalanceMax() { loadMaxValue('whiteBalance', '/api/get/white-balance/max'); }
function setWhiteBalance() { setValue('whiteBalance', '/api/post/white-balance'); }

async function capture() {
    try {
        const response = await fetch('/api/post/capture-image/capture', { method: 'POST' });
        const responseDiv = document.getElementById('captureImageResponse');
        
        const data = await response.json();
        
        
        if (response.ok) {
            responseDiv.textContent = 'Снимок сделан успешно';
            responseDiv.style.color = 'green';
        } else {
            responseDiv.textContent = `Ошибка: ${data.error}`;
            responseDiv.style.color = 'red';
        }
        responseDiv.style.display = 'block';
    } catch (error) {
        const responseDiv = document.getElementById('captureImageResponse');
        responseDiv.textContent = `Ошибка при съемке: ${error.message}`;
        responseDiv.style.color = 'red';
        responseDiv.style.display = 'block';
        console.error('Ошибка:', error);
    }
}

let isEvf = localStorage.getItem('isEvf') === 'true';
let liveViewInterval;
let lastLiveViewUpdate = null;
let isFetchingLiveView = false;

const liveViewImage = document.getElementById('liveViewImage');
const liveViewContainer = document.getElementById('liveViewContainer');
const noResponseWarning = document.createElement('p');
noResponseWarning.style.color = 'red';
noResponseWarning.textContent = 'Давно не было ответа от Live View.';
noResponseWarning.style.display = 'none';
liveViewContainer.parentNode.insertBefore(noResponseWarning, liveViewContainer.nextSibling);

if (isEvf) {
    startLiveView();
}

async function startLiveView() {
    localStorage.setItem('isEvf', 'true');
    isEvf = true;
    try {
        await fetch('/api/post/evf/start', { method: 'POST' });
        liveViewInterval = setInterval(updateLiveView, 100);
        lastLiveViewUpdate = Date.now();
        noResponseWarning.style.display = 'none';
    } catch (error) {
        console.error('Ошибка при включении Live View:', error);
    }
}

async function endLiveView() {
    localStorage.setItem('isEvf', 'false');
    isEvf = false;
    try {
        await fetch('/api/post/evf/end', { method: 'POST' });
        clearInterval(liveViewInterval);
        liveViewImage.style.display = 'none';
        noResponseWarning.style.display = 'none';
    } catch (error) {
        console.error('Ошибка при выключении Live View:', error);
    }
}

async function updateLiveView() {
    // Проверяем, не выполняется ли уже запрос
    if (isFetchingLiveView) {
        return; // Если выполняется, выходим из функции
    }

    isFetchingLiveView = true; // Устанавливаем флаг перед отправкой запроса

    try {
        const response = await fetch('/api/get/live-view');
        if (response.ok) {
            const blob = await response.blob();
            liveViewImage.src = URL.createObjectURL(blob);
            liveViewImage.style.display = 'block';
            liveViewImage.onload = () => URL.revokeObjectURL(liveViewImage.src);
            lastLiveViewUpdate = Date.now();
            noResponseWarning.style.display = 'none';
        } else {
            //console.error('Ошибка при получении Live View:', response.status);
        }
    } catch (error) {
        //console.error('Ошибка live view:', error);
    } finally {
        isFetchingLiveView = false;
    }

    if (lastLiveViewUpdate && Date.now() - lastLiveViewUpdate > 60000) {
        noResponseWarning.style.display = 'block';
        clearInterval(liveViewInterval);
    }
}

async function focusNear1() {
    try {
        await fetch('/api/post/evf/focus-near1', { method: 'POST' });
    } catch (error) {
        console.error('Focus near error:', error);
    }
}

async function focusNear2() {
    try {
        await fetch('/api/post/evf/focus-near2', { method: 'POST' });
    } catch (error) {
        console.error('Focus near error:', error);
    }
}

async function focusNear3() {
    try {
        await fetch('/api/post/evf/focus-near3', { method: 'POST' });
    } catch (error) {
        console.error('Focus near error:', error);
    }
}

async function focusFar1() {
    try {
        await fetch('/api/post/evf/focus-far1', { method: 'POST' });
    } catch (error) {
        console.error('Focus far error:', error);
    }
}

async function focusFar2() {
    try {
        await fetch('/api/post/evf/focus-far2', { method: 'POST' });
    } catch (error) {
        console.error('Focus far error:', error);
    }
}

async function focusFar3() {
    try {
        await fetch('/api/post/evf/focus-far3', { method: 'POST' });
    } catch (error) {
        console.error('Focus far error:', error);
    }
}

async function zoom() {
    try {
        await fetch('/api/post/evf/zoom', { method: 'POST' });
    } catch (error) {
        console.error('Zoom far error:', error);
    }
}

async function fit() {
    try {
        await fetch('/api/post/evf/fit', { method: 'POST' });
    } catch (error) {
        console.error('Fit far error:', error);
    }
}

async function evfafon() {
    try {
        await fetch('/api/post/evf-af-on', { method: 'POST' });
    } catch (error) {
        console.error('Evf af on far error:', error);
    }
}

async function evfafoff() {
    try {
        await fetch('/api/post/evf-af-off', { method: 'POST' });
    } catch (error) {
        console.error('Evf af off far error:', error);
    }
}

async function leftPosition() {
    try {
        await fetch('/api/post/left-position', { method: 'POST' });
    } catch (error) {
        console.error('Left position far error:', error);
    }
}

async function rightPosition() {
    try {
        await fetch('/api/post/right-position', { method: 'POST' });
    } catch (error) {
        console.error('Right position far error:', error);
    }
}

async function upPosition() {
    try {
        await fetch('/api/post/up-position', { method: 'POST' });
    } catch (error) {
        console.error('Up position far error:', error);
    }
}

async function downPosition() {
    try {
        await fetch('/api/post/down-position', { method: 'POST' });
    } catch (error) {
        console.error('Down position far error:', error);
    }
}

async function reconnect() {
    const wasEvfActive = isEvf;
    try {
        if (wasEvfActive) {
            console.log('Выключаем EVF перед реконнектом...');
            await endLiveView();
            console.log('EVF выключен.');
        }

        console.log('Реконнект...');
        await fetch('/api/post/reconnect', { method: 'POST' });
        console.log('Реконнект успешен.');

        if (wasEvfActive) {
            console.log('Ждем 3 секунды перед включением EVF...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log('Включаем EVF после реконнекта...');
            await startLiveView();
            console.log('EVF включен.');
        }
    } catch (error) {
        console.error('Ошибка реконнекта:', error);
    }
}