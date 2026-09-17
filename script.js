// --- ПЕРЕКЛЮЧЕНИЕ ТАБОВ ИНТЕРФЕЙСА ---
document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        button.classList.add('active');
        const activeTab = button.getAttribute('data-tab');
        document.getElementById(activeTab).classList.add('active');
        
        // Пересчитываем размеры 3D-сцены при возврате на вкладку симуляции
        if(activeTab === 'simulation' && window.onWindowResize) {
            window.onWindowResize();
        }
    });
});

// --- ИНИЦИАЛИЗАЦИЯ THREE.JS ДЛЯ 3D СБОРКИ ---
let scene, camera, renderer;
let robotParts = []; // Хранилище объектов робота на сцене
let isSimulating = false;

function init3D() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // 1. Создание сцены
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);

    // 2. Камера
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 0, 0);

    // 3. Рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 4. Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Сетка земли (Grid Helper) для ориентирования инженера
    const gridHelper = new THREE.GridHelper(10, 20, 0x007acc, 0x2e3b4e);
    scene.add(gridHelper);

    // Простой цикл анимации
    function animate() {
        requestAnimationFrame(animate);
        
        // Если запущена симуляция робота — заставим детали слегка двигаться/вращаться
        if (isSimulating && robotParts.length > 0) {
            robotParts.forEach(part => {
                part.position.x += Math.sin(Date.now() * 0.003) * 0.01;
            });
        }
        
        renderer.render(scene, camera);
    }
    animate();

    // Адаптивность 3D-окна при изменении размеров экрана
    window.onWindowResize = function() {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', window.onWindowResize);
}

// --- ФУНКЦИИ СБОРКИ И РОБОТОТЕХНИКИ ---

// Добавление 3D-деталей на сцену
function addPart(type) {
    let geometry, material, mesh;
    
    switch(type) {
        case 'chassis':
            geometry = new THREE.BoxGeometry(3, 0.4, 2);
            material = new THREE.MeshStandardMaterial({ color: 0x3e4c5e, roughness: 0.4 });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, 0.2, 0);
            mesh.name = "Шасси";
            break;
            
        case 'wheel':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
            material = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
            mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.z = Math.PI / 2;
            // Рандомно раскидываем колеса в стороны шасси
            mesh.position.set(Math.random() > 0.5 ? 1.6 : -1.6, 0.5, Math.random() > 0.5 ? 0.8 : -0.8);
            mesh.name = "Колесо";
            break;
            
        case 'sensor':
            geometry = new THREE.BoxGeometry(0.3, 0.3, 0.6);
            material = new THREE.MeshStandardMaterial({ color: 0x007acc });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, 0.6, 1);
            mesh.name = "Датчик";
            break;

        case 'manipulator':
            geometry = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8);
            material = new THREE.MeshStandardMaterial({ color: 0xe13434 });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, 1, -0.5);
            mesh.name = "Захват";
            break;
    }

    if (mesh) {
        scene.add(mesh);
        robotParts.push(mesh);
        logTerminal(`[СБОРКА] Добавлен компонент: ${mesh.name}`);
    }
}

// Управление физической симуляцией (визуализация работы)
function startSimulation() {
    if(robotParts.length === 0) {
        alert("Сначала добавьте детали на сцену!");
        return;
    }
    isSimulating = !isSimulating;
    const btn = document.querySelector('.trigger-test');
    if (isSimulating) {
        btn.innerText = "⏸️ Остановить симуляцию";
        btn.style.backgroundColor = "#ef4444";
        logTerminal("[СИМУЛЯЦИЯ] Двигатели запущены. Опрос датчиков активен.");
    } else {
        btn.innerText = "▶️ Запустить симуляцию";
        btn.style.backgroundColor = "#10b981";
        logTerminal("[СИМУЛЯЦИЯ] Работа приостановлена.");
    }
}

// Сброс сцены
function resetScene() {
    robotParts.forEach(part => scene.remove(part));
    robotParts = [];
    isSimulating = false;
    const btn = document.querySelector('.trigger-test');
    btn.innerText = "▶️ Запустить симуляцию";
    btn.style.backgroundColor = "#10b981";
    logTerminal("[ОЧИСТКА] Робот разобран. Сцена пуста.");
}

// --- ФУНКЦИОНАЛ ИМИТАЦИИ IDE (КОДИНГ) ---
function compileCode() {
    const consoleBox = document.getElementById('terminal-output');
    consoleBox.innerHTML = `[COMPILING] Запуск сборщика avr-g++...<br>`;
    
    setTimeout(() => {
        consoleBox.innerHTML += `[COMPILING] Проверка синтаксиса и линковка библиотек...<br>`;
    }, 600);

    setTimeout(() => {
        consoleBox.innerHTML += `<span style="color: #10b981;">[SUCCESS] Компиляция завершена успешно! Скетч использует 4342 байт (14%) памяти. Сброс платы выполнен через порт COM3.</span>`;
        logTerminal("[ПРОШИВКА] Новый микрокод успешно залит в ядро виртуального робота.");
    }, 1500);
}

// Функция вывода логов в системный терминал (общая утилита)
function logTerminal(message) {
    const consoleBox = document.getElementById('terminal-output');
    if(consoleBox) {
        consoleBox.innerHTML += `<br>${message}`;
        consoleBox.scrollTop = consoleBox.scrollHeight;
    }
}

// Инициализация при загрузке страницы
window.onload = () => {
    init3D();
};
