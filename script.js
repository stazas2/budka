const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./utils/configLoader');

// DOM Elements
const styleScreen = document.getElementById('style-screen');
const genderScreen = document.getElementById('gender-screen');
const cameraScreen = document.getElementById('camera-screen');
const processingScreen = document.getElementById('processing-screen');
const resultScreen = document.getElementById('result-screen');

const resultTitle = resultScreen.querySelector('h1');
resultTitle.style.display = 'none';

const styleButtonsContainer = document.getElementById('style-buttons');
const genderButtons = document.querySelectorAll('#gender-buttons .button');
const countdownElement = document.getElementById('countdown');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const resultImage = document.getElementById('result-image');
const startOverButton = document.getElementById('start-over');
const printPhotoButton = document.getElementById('print-photo');
const progressBar = document.getElementById('progress-bar');
const progressBarFill = document.getElementById('progress-bar-fill');

let selectedStyle = '';
let selectedGender = '';
let videoStream = null;
let cameraInitialized = false;

// Основная папка для хранения изображений
const baseDir = 'C:\\MosPhotoBooth';
const config = loadConfig();

// Применяем вращение для элементов на основе конфигурации
function applyRotationStyles() {
    const videoElement = document.getElementById('video');
    const resultImage = document.getElementById('result-image');

    if (videoElement) {
        videoElement.style.transform = `rotate(${config.camera_rotation}deg)`;
        console.log(`Camera rotation set to ${config.camera_rotation} degrees.`);
    }
    
    if (resultImage) {
        resultImage.style.transform = `rotate(${config.final_image_rotation}deg)`;
        console.log(`Final image rotation set to ${config.final_image_rotation} degrees.`);
    }
}

// Вызываем функцию для применения стилей после загрузки конфигурации и элементов
applyRotationStyles();


// Функция для создания папок с датой и input/output, если их еще нет
function createDateFolders() {
    const dateFolder = path.join(baseDir, new Date().toISOString().slice(0, 10).replace(/-/g, '_'));
    const inputDir = path.join(dateFolder, 'input');
    const outputDir = path.join(dateFolder, 'output');

    if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    return { inputDir, outputDir };
}

// Генерация имени файла
function generateFileName() {
    const date = new Date();
    const timeString = `${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}`;
    const randomString = Math.random().toString(36).substring(2, 6); // Случайные символы
    return `${timeString}_${randomString}.jpg`;
}

// Функция сохранения изображения в формате JPG
function saveImage(folderType, base64Image) {
    const { inputDir, outputDir } = createDateFolders(); // Создаем папки с датой

    const folderPath = folderType === "input" ? inputDir : outputDir;
    const fileName = generateFileName();
    const filePath = path.join(folderPath, fileName);
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(filePath, imageData, 'base64');
    console.log(`Image saved to ${filePath}`);
}

// Функция для получения доступных стилей
function fetchStyles() {
    ipcRenderer.invoke('get-styles').then(styles => {
        console.log('Received styles:', styles);
        initStyleButtons(styles);
    }).catch(error => {
        console.error('Error fetching styles:', error);
        alert('Failed to load styles. Please try again later.');
    });
}

// Инициализация кнопок стилей
function initStyleButtons(parsedStyles) {
    if (!styleButtonsContainer) {
        console.error('Element style-buttons not found.');
        return;
    }
    styleButtonsContainer.innerHTML = ''; // Очистка предыдущих кнопок

    parsedStyles.forEach(style => {
        console.log('Adding style to UI:', style);
        const button = document.createElement('div');
        button.classList.add('button');
        button.setAttribute('data-style', style.originalName);

        const img = document.createElement('img');
        img.src = `${config.stylesDir}\\${style.originalName}${style.displayName !== style.originalName ? ` (${style.displayName})` : ''}.jpg`;

        img.alt = style.displayName;

        const label = document.createElement('div');
        label.textContent = style.displayName;

        button.appendChild(img);
        button.appendChild(label);

        button.addEventListener('click', () => {
            selectedStyle = style.originalName;
            console.log(`Style selected: ${selectedStyle}`);
            showScreen('gender-screen');
        });

        styleButtonsContainer.appendChild(button);
    });
}

fetchStyles();

// Выбор пола
genderButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedGender = button.getAttribute('data-gender');
        console.log(`Gender selected: ${selectedGender}`);
        showScreen('camera-screen');
        startCamera().then(() => {
            startCountdown();
        }).catch(err => {
            alert('Unable to access the webcam.');
            showScreen('style-screen');
        });
    });
});

// Показать конкретный экран
function showScreen(screenId) {
    console.log(`Switching to screen: ${screenId}`);
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.classList.add('active');
        console.log(`Screen ${screenId} is now active.`);
        if (screenId === 'result-screen') {
            resultTitle.style.display = 'block';
        } else {
            resultTitle.style.display = 'none';
        }
    } else {
        console.error(`Screen with ID "${screenId}" not found.`);
    }
}

const resolutions = [
    { width: 1920, height: 1280 }, // Full HD
    { width: 1080, height: 720 },  // HD
    { width: 640, height: 480 }    // SD
];

async function findBestResolution() {
    for (let resolution of resolutions) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { exact: resolution.width },
                    height: { exact: resolution.height }
                }
            });
            // Если камера поддерживает разрешение, останавливаем поток и возвращаем разрешение
            stream.getTracks().forEach(track => track.stop());
            console.log(`Supported resolution found: ${resolution.width}x${resolution.height}`);
            return resolution;
        } catch (error) {
            console.log(`Resolution ${resolution.width}x${resolution.height} not supported.`);
            // Продолжаем к следующему разрешению
        }
    }
    throw new Error("No supported resolutions found.");
}

// Используем найденное разрешение при запуске камеры
async function startCamera() {
    try {
        const bestResolution = await findBestResolution();
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: bestResolution.width,
                height: bestResolution.height
            }
        });
        videoStream = stream;
        video.srcObject = stream;
        cameraInitialized = true;
        console.log(`Camera initialized with resolution ${bestResolution.width}x${bestResolution.height}`);
    } catch (error) {
        console.error("Failed to start camera:", error);
    }
}


// Остановка камеры
function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        videoStream = null;
        cameraInitialized = false;
        console.log('Camera stopped');
    }
}

// Запуск обратного отсчета
function startCountdown() {
    if (!cameraInitialized) {
        alert('Camera is not ready. Please try again.');
        showScreen('style-screen');
        return;
    }
    if (video.readyState >= 1) {
        beginCountdown();
    } else {
        video.onloadedmetadata = beginCountdown;
    }
}

// Начало обратного отсчета
function beginCountdown() {
    let countdown = config.prePhotoTimer || 5; // Значение по умолчанию - 5, если нет в конфиге
    countdownElement.textContent = countdown;
    const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownElement.textContent = countdown;
        } else {
            clearInterval(interval);
            countdownElement.textContent = '';
            takePicture();
        }
    }, 1000);
}

// Функция для создания снимка
function takePicture() {
    const context = canvas.getContext('2d');
    const rotationAngle = config.send_image_rotation || 0;

    // Определяем размеры для canvas в зависимости от угла поворота
    if (rotationAngle === 90 || rotationAngle === 270) {
        canvas.width = video.videoHeight;
        canvas.height = video.videoWidth;
    } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    // Очищаем canvas перед рисованием
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Поворачиваем и рисуем изображение
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((rotationAngle * Math.PI) / 180);

    // Рисуем изображение в зависимости от поворота
    if (rotationAngle === 90 || rotationAngle === 270) {
        context.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2, video.videoWidth, video.videoHeight);
    } else {
        context.drawImage(video, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    }

    context.restore();

    stopCamera();

    // Получаем данные изображения и сохраняем их
    const imageData = canvas.toDataURL('image/jpeg', 1.0);
    saveImage("input", imageData);

    sendImageToServer(imageData);
}



// Отправка изображения на сервер
function sendImageToServer(imageData) {
    console.log('sendImageToServer() function called');
    showScreen('processing-screen');
    const base64Image = imageData.split(',')[1];

    // Получаем случайное изображение для `Fon` из папки стиля
    const fonImage = getRandomImageFromStyleFolder(selectedStyle);
    const base64FonImage = fonImage ? fonImage.split(',')[1] : base64Image; // Используем изображение с камеры, если `Fon` не найдено

    const data = {
        mode: "style_sdxl",
        style: selectedStyle,
        params: {
            Sex: selectedGender,
            Face: base64Image,
            Fon: base64FonImage
        }
    };

    const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer fc612550-06e8-4be3-9191-0f97336d9966`,
        'Content-Type': 'application/json'
    };

    const fetchOptions = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    };

    // Сохраняем запрос в текстовый файл
    const logFilePath = path.join('C:', 'MosPhotoBooth', 'request_log.txt');
    const logContent = `Headers: ${JSON.stringify(headers, null, 2)}\nData: ${JSON.stringify(data, null, 2)}`;
    fs.writeFileSync(logFilePath, logContent, 'utf-8');
    console.log(`Request saved to ${logFilePath}`);

    progressBar.style.display = 'block';
    progressBarFill.style.width = '0%';
    progressBarFill.textContent = '0%';

    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 100) {
            progress += 1;
            progressBarFill.style.width = progress + '%';
            progressBarFill.textContent = progress + '%';
        } else {
            clearInterval(progressInterval);
        }
    }, 100);

    fetch('http://85.95.186.114/api/handler/', fetchOptions)
        .then(response => {
            console.log('HTTP response status:', response.status);
            if (!response.ok) {
                throw new Error('Network error, status: ' + response.status);
            }
            return response.json();
        })
        .then(responseData => {
            console.log('Data received from server:', responseData);
            clearInterval(progressInterval);
            handleServerResponse(responseData);
        })
        .catch(error => {
            console.error('Error sending data to server:', error);
            clearInterval(progressInterval);
            alert('An error occurred while sending the image to the server. Check the console for details.');
            showScreen('style-screen');
        });
}

// Обработка ответа от сервера
// Обработка ответа от сервера
async function handleServerResponse(responseData) {
    console.log('handleServerResponse() function called');
    progressBar.style.display = 'none';
    progressBarFill.style.width = '0%';
    progressBarFill.textContent = '0%';

    const imagesArray = Object.values(responseData)[0];

    if (imagesArray && imagesArray.length > 0) {
        const base64Image = imagesArray[0];
        const cleanedBase64Image = base64Image.replace(/[\n\r"']/g, '').trim();
        
        // Создаем изображение и накладываем логотип
        const finalImageWithLogo = await overlayLogoOnImage(cleanedBase64Image);
        resultImage.src = finalImageWithLogo;

        // Сохранение готового изображения с логотипом в папку "output"
        saveImage("output", finalImageWithLogo);

        resultImage.onload = () => {
            console.log('Image loaded successfully');
            console.log(`Image dimensions: ${resultImage.clientWidth}x${resultImage.clientHeight}`);
            showScreen('result-screen');
        };
    } else {
        alert('Failed to retrieve processed image.');
        showScreen('style-screen');
    }
}

// Функция наложения логотипа
async function overlayLogoOnImage(base64Image) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const mainImage = new Image();
        const logoImage = new Image();
        
        mainImage.src = `data:image/jpeg;base64,${base64Image}`;
        logoImage.src = config.logoPath; // Путь к логотипу из конфигурации

        mainImage.onload = () => {
            canvas.width = mainImage.width;
            canvas.height = mainImage.height;
            context.drawImage(mainImage, 0, 0, canvas.width, canvas.height);

            // Загружаем логотип и позиционируем его
            logoImage.onload = () => {
                console.log("Logo loaded successfully");

                const offsetX = config.logoOffsetX || 0;
                const offsetY = config.logoOffsetY || 0;
                let x = 0;
                let y = 0;

                // Определение позиции логотипа в зависимости от logoPosition
                switch (config.logoPosition) {
                    case 'top-left':
                        x = offsetX;
                        y = offsetY;
                        break;
                    case 'top-right':
                        x = canvas.width - logoImage.width - offsetX;
                        y = offsetY;
                        break;
                    case 'bottom-left':
                        x = offsetX;
                        y = canvas.height - logoImage.height - offsetY;
                        break;
                    case 'bottom-right':
                        x = canvas.width - logoImage.width - offsetX;
                        y = canvas.height - logoImage.height - offsetY;
                        break;
                    case 'center':
                        x = (canvas.width - logoImage.width) / 2;
                        y = (canvas.height - logoImage.height) / 2;
                        break;
                    case 'center-top':
                        x = (canvas.width - logoImage.width) / 2;
                        y = offsetY;
                        break;
                    case 'center-bottom':
                        x = (canvas.width - logoImage.width) / 2;
                        y = canvas.height - logoImage.height - offsetY;
                        break;
                    default:
                        console.warn(`Invalid logo position: ${config.logoPosition}. Defaulting to bottom-right.`);
                        x = canvas.width - logoImage.width - offsetX;
                        y = canvas.height - logoImage.height - offsetY;
                        break;
                }

                // Накладываем логотип
                context.drawImage(logoImage, x, y);
                resolve(canvas.toDataURL('image/jpeg'));
            };

            logoImage.onerror = () => {
                console.error("Failed to load logo image. Check logoPath in config.");
                resolve(canvas.toDataURL('image/jpeg')); // Возвращаем изображение без логотипа
            };
        };

        mainImage.onerror = () => {
            console.error("Failed to load main image.");
            resolve(null); // Возвращаем null при ошибке
        };
    });
}




// Вспомогательная функция для получения случайного изображения из папки стиля
function getRandomImageFromStyleFolder(style) {
    try {
        // Загружаем путь из конфигурации
        const styleFolderPath = path.join(config.stylesDir, style);
        
        if (!fs.existsSync(styleFolderPath)) {
            console.warn(`Folder for style "${style}" does not exist.`);
            return null;
        }

        // Получаем все файлы изображений из папки
        const files = fs.readdirSync(styleFolderPath).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
        
        if (files.length === 0) {
            console.warn(`No images found in the folder for style: ${style}`);
            return null;
        }
        
        // Выбираем случайный файл из списка
        const randomFile = files[Math.floor(Math.random() * files.length)];
        const filePath = path.join(styleFolderPath, randomFile);
        
        // Читаем изображение и конвертируем его в base64
        const imageData = fs.readFileSync(filePath, { encoding: 'base64' });
        const mimeType = randomFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        return `data:${mimeType};base64,${imageData}`;
    } catch (error) {
        console.error(`Error retrieving background image for style: ${style}`, error);
        return null;
    }
}



// Обработка нажатия кнопки начала заново
if (startOverButton) {
    startOverButton.addEventListener('click', () => {
        console.log('Start over button clicked');
        selectedStyle = '';
        selectedGender = '';
        resultImage.src = '';
        stopCamera();
        showScreen('style-screen');
    });
} else {
    console.error('Start over button not found.');
}

// Обработка нажатия кнопки печати
if (printPhotoButton) {
    printPhotoButton.addEventListener('click', () => {
        console.log('Print photo button clicked');
        if (resultImage && resultImage.src) {
            const imageData = resultImage.src;
            const isLandscape = resultImage.width > resultImage.height;
            ipcRenderer.send('print-photo', {
                imageData: imageData,
                isLandscape: isLandscape
            });
        } else {
            console.error('Image not found for printing.');
        }
    });
} else {
    console.error('Print photo button not found.');
}

// Обработка ответа печати
ipcRenderer.on('print-photo-response', (event, success) => {
    if (success) {
        console.log('Print job completed successfully.');
    } else {
        console.error('Print job failed.');
    }
});
