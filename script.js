// --- ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ СЦЕНЫ THREE.JS ---
let scene, camera, renderer, controls;
let robotGroup; // Единая группа (сборка робота), куда монтируются детали
let partsData = []; // Метаданные деталей для дерева компонентов
let isPhysicsRunning = false;
let clock = new THREE.Clock();

function initCADCore() {
    const container = document.getElementById('viewport-3d');
    if (!container) return;

    // 1. Создание 3D Сцены
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d12);
    // Добавим легкий синий туман для глубины пространства
    scene.fog = new THREE.FogExp2(0x0a0d12, 0.03);

    // 2. Настройка перспективной инженерной камеры
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4, 4, 6);

    // 3. Высокоточный WebGL рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 4. ОРБИТАЛЬНОЕ УПРАВЛЕНИЕ МЫШЬЮ (OrbitControls)
    // Реализует полноценное вращение сцены, приближение скроллом и панорамирование
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Плавность торможения камеры
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01; // Не позволяет камере уходить под землю

    // 5. Окружающий свет и координатные направляющие
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(10, 15, 10);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x00e5ff, 0.6, 10);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    // Сетка земли (Industrial Grid)
    const gridHelper = new THREE.GridHelper(20, 40, 0x222c3c, 0x161d28);
    scene.add(gridHelper);

    // Инициализируем пустую группу робота
    robotGroup = new THREE.Group();
    scene.add(robotGroup);

    // Главный цикл рендеринга и анимации
    function renderLoop() {
        requestAnimationFrame(renderLoop);
        
        // Обновляем трекер мыши
        controls.update();

        // Имитация физической работы кинематики робота
        if (isPhysicsRunning && partsData.length > 0) {
            const time = clock.getElapsedTime();
            
            // Заставим робота ехать по кругу, а модули функционировать
            robotGroup.position.x = Math.sin(time * 0.5) * 1.5;
            robotGroup.position.z = Math.cos(time * 0.5) * 1.5;
            robotGroup.rotation.y = time * 0.5;

            // Вращаем колеса внутри сборки
            robotGroup.children.forEach(child => {
                if (child.name.includes("Колесо")) {
                    child.rotation.x += 0.05;
                }
                if (child.name.includes("Лидар")) {
                    child.rotation.y += 0.1; // Вращение головки лидара
                }
            });

            // Обновление панели телеметрии данными в реальном времени
            document.getElementById('val-coords').innerText = `${robotGroup.position.x.toFixed(2)}, 0.00, ${robotGroup.position.z.toFixed(2)}`;
            document.getElementById('val-hz').innerText = `${Math.floor(440 + Math.random()*20)} Гц`;
        }

        renderer.render(scene, camera);
    }
    renderLoop();

    // Обработчик изменения размеров экрана
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

// --- СИСТЕМА ОПЕРАЦИЙ CAD (СПАВН И УДАЛЕНИЕ ДЕТАЛЕЙ) ---

function spawnPart(type) {
    let geometry, material, mesh;
    const id = Date.now(); // Генерация уникального ID узла

    switch(type) {
        case 'chassis':
            // Создаем жесткую несущую раму
            geometry = new THREE.BoxGeometry(2, 0.2, 1.4);
            material = new THREE.MeshStandardMaterial({ color: 0x2d3748, metalness: 0.8, roughness: 0.2 });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, 0.1, 0);
            mesh.name = `Шасси [ID: ${id.toString().slice(-4)}]`;
            break;

        case 'wheel':
            // Цилиндр для колеса
            geometry = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 24);
            material = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.7 });
            mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.z = Math.PI / 2;
            // Авто-размещение колес по углам
            const offsetLeft = partsData.filter(p => p.type === 'wheel').length % 2 === 0 ? 1.1 : -1.1;
            const offsetFront = partsData.filter(p => p.type === 'wheel').length < 2 ? 0.6 : -0.6;
            mesh.position.set(offsetLeft, 0.4, offsetFront);
            mesh.name = `Колесо [ID: ${id.toString().slice(-4)}]`;
            break;

        case 'lidar':
            // Конструкция лазерного дальномера
            const baseGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
            const headGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16);
            const matBase = new THREE.MeshStandardMaterial({ color: 0x007acc });
            const matHead = new THREE.MeshStandardMaterial({ color: 0x00e5ff });
            
            const baseMesh = new THREE.Mesh(baseGeo, matBase);
            const headMesh = new THREE.Mesh(headGeo, matHead);
            headMesh.position.y = 0.15;
            
            mesh = new THREE.Group();
            mesh.add(baseMesh);
            mesh.add(headMesh);
            mesh.position.set(0, 0.3, 0.5); // Ставим на переднюю часть рамы
            mesh.name = `Лидар [ID: ${id.toString().slice(-4)}]`;
            break;

        case 'arm':
            // Рука-манипулятор
            geometry = new THREE.BoxGeometry(0.15, 1.0, 0.15);
            material = new THREE.MeshStandardMaterial({ color: 0xff3d00 });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, 0.7, -0.4);
            mesh.name = `Манипулятор [ID: ${id.toString().slice(-4)}]`;
            break;
    }

    if (mesh) {
        mesh.userData = { customId: id }; // Запись ID в метаданные 3D объекта
        robotGroup.add(mesh);
        
        // Сохраняем в массив данных
        partsData.push({ id: id, type: type, name: mesh.name, ref: mesh });
        
        // Обновляем UI дерева компонентов
        renderAssemblyTree();
        printLog(`[CAD] Развернут узел: ${mesh.name}`);
    }
}

// Удаление узла из дерева и 3D-сцены
function deletePart(id) {
    const index = partsData.findIndex(p => p.id === id);
    if (index !== -1) {
        const item = partsData[index];
        robotGroup.remove(item.ref); // Удаляем из 3D мира
        printLog(`[CAD] Демонтирован узел: ${item.name}`);
        partsData.splice(index, 1);
        renderAssemblyTree();
    }
}

// Генератор HTML дерева сборки
function renderAssemblyTree() {
    const tree = document.getElementById('assembly-tree');
    tree.innerHTML = '<li class="tree-root">📦 Робот_Сборка_1</li>';
    
    partsData.forEach(part => {
        const li = document.createElement('li');
        li.className = 'tree-item';
        li.innerHTML = `<span>🔹 ${part.name}</span> <span class="delete-node" onclick="deletePart(${part.id})">×</span>`;
        tree.appendChild(li);
    });
}

// Очистка сцены
function clearScene() {
    partsData.forEach(part => robotGroup.remove(part.ref));
    partsData = [];
    robotGroup.position.set(0,0,0);
    robotGroup.rotation.set(0,0,0);
    isPhysicsRunning = false;
    document.getElementById('sim-toggle-btn').innerText = "▶ Запустить физику";
    document.getElementById('sim-toggle-btn').classList.remove('active');
    renderAssemblyTree();
    printLog("[SYS] Сцена полностью очищена. Сборка аннулирована.");
}

// --- УПРАВЛЕНИЕ СИМУЛЯЦИЕЙ И ФИЗИКОЙ ---
function toggleSimulation() {
    if (partsData.length === 0) {
        alert("Невозможно запустить симуляцию пустого пространства. Добавьте хотя бы один узел робота.");
        return;
    }
    isPhysicsRunning = !isPhysicsRunning;
    const btn = document.getElementById('sim-toggle-btn');
    if (isPhysicsRunning) {
        btn.innerText = "⏸ Остановить физику";
        btn.classList.add('active');
        printLog("[SIM] Физический движок запущен. Захват потока одометрии.");
    } else {
        btn.innerText = "▶ Запустить физику";
        btn.classList.remove('active');
        printLog("[SIM] Симуляция заморожена.");
    }
}

// --- РАБОТА С IDE (КОМПИЛЯЦИЯ И СВЯЗЬ) ---
function compileAndUpload() {
    const screen = document.getElementById('terminal-screen');
    screen.innerHTML = `<span style="color: #00e5ff;">[IDE] Инициализация GNU Web-Compiler (target: ARM Cortex-M4)...</span><br>`;
    
    setTimeout(() => {
        screen.innerHTML += `[IDE] Компиляция исходных файлов (.cpp)...<br>[IDE] Сборка бинарного образа завершена успешно.<br>`;
    }, 700);

    setTimeout(() => {
        screen.innerHTML += `<span style="color: var(--accent-green);">[SUCCESS] Прошивка загружена в контроллер. Контрольная сумма CRC32: 0xF4B32A1C. Виртуальный стек ядра перезагружен.</span>`;
        printLog("[SYS] Обновлен управляющий алгоритм робота.");
    }, 1400);
}

// Имитация интеграции с реальным оборудованием через Web Serial API
function connectHardware() {
    const statusLabel = document.getElementById('com-status');
    printLog("[HARDWARE] Запрос доступа к последовательному COM-порту...");
    
    setTimeout(() => {
        statusLabel.innerText = "Аппаратная связь: COM4 (115200 бод)";
        statusLabel.previousElementSibling.className = "dot pulse-green";
