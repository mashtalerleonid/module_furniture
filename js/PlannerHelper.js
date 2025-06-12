class PlannerHelper {
    constructor(plannerContainer, R2D, configurator) {
        this.configurator = configurator;

        this.planner = new R2D.PlannerCore();
        R2D.Viewers.enableViewer(2);
        R2D.view3d.setSize(plannerContainer.offsetWidth, plannerContainer.offsetHeight);
        this.plannerDom = this.planner.getDomElement();
        plannerContainer.appendChild(this.plannerDom);

        R2D.usedByConfigurator = true;

        this.productsDataLoader = new R2D.ProductsDataLoader();
        this.materialsOnModelMap = new Map();

        this.isCameraMoveEnabled = true;
        this.sceneObject = null;
        this.distToCam = 0;

        // -------------------- Listeners -------------------
        window.addEventListener("resize", () => {
            this.planner.setSize(plannerContainer.offsetWidth, plannerContainer.offsetHeight);
        });

        this.plannerDom.addEventListener("mousedown", this.planner.scene.mousedown);

        this.plannerDom.addEventListener("mousemove", this.planner.scene.mousemove);

        this.planner.apiScene.addEventListener(this.planner.apiScene.CAMERA_MOVE, (e) => {
            if (!this.isCameraMoveEnabled) return;

            R2D.Viewers.cameraMove(e.data.x, e.data.y);
        });

        this.plannerDom.addEventListener("mouseup", this.planner.scene.mouseup);

        this.plannerDom.addEventListener("wheel", (e) => {
            const zoomDirection = e.deltaY < 0 ? -1 : 1;
            R2D.view3d.cameraZoomSmooth(zoomDirection);
        });
        // -------------------- end Listeners -------------------
    }

    disableCameraMoving() {
        // Заборонити рух камери правою кнопкою миші і клавіатурою
        this.isCameraMoveEnabled = false;
        R2D.keyboardInteractionHelper.updateComponents(null, null);
    }

    enableCameraMoving() {
        // Дозволити рух камери правою кнопкою миші і клавіатуроюф
        this.isCameraMoveEnabled = true;
        R2D.keyboardInteractionHelper.updateComponents(document.body, R2D.view3d);
    }

    setBgdColor(color) {
        // Встановити фон сцени (колір неба)
        R2D.scene3d.middle.background = new THREE.Color(color);
    }

    hideTerrain() {
        // Забрати сіру землю (не буде працювати лінійка)
        R2D.commonSceneObject.hideTerrain();
    }

    removeTerrainTexture() {
        // Забрати текстуру з землі
        R2D.commonSceneObject.removeTextureFromTerrain();
    }

    addSizesToModel() {
        this.configurator.sceneObject.update();
        R2D.ObjectViewer3D.addSizes(this.configurator.model3d, this.distToCam);
    }

    blockSelectAndDrag() {
        //Заборонити виділення і перетягування моделі
        R2D.mouseInteractionHelper.state.setIsSelectingModel(false);
    }

    setMinElevation(minElevation) {
        // Встановити мінімальну відстань від підлоги для моделі
        R2D.scene.setMinElevation(minElevation);
    }

    updateCameraSettings(sceneObject, useDefault = true) {
        // Встановити налаштування камери на основі розмірів моделі
        const { width, height, depth } = sceneObject;
        const vFovRad = (Math.PI / 180) * R2D.mouseInteractionHelper._currentCamera.fov;
        const aspect = R2D.mouseInteractionHelper._currentCamera.aspect;

        const distance = findCameraDist(aspect, vFovRad, width, height, depth);
        const minDist = distance * 0.3;
        const maxDist = distance * 1.5;
        
        R2D.view3d.setCameraSettings({
            minDist, //мінімальна відстань від моделі до камери
            maxDist, //максимальна відстань від моделі до камери
            distance, //відстань від моделі до камери
            pan: useDefault ? 0.5 : R2D.view3d.cameraState.pan, //поворот камери вліво-вправо
            tilt: useDefault ? 0.6 : R2D.view3d.cameraState.tilt.current, //поворот камери вверх-вниз
            far: 8000, //максимальна відстань, на якій камера рендерить
            minHeight: height / 2, //Мінімальна висота камери, сумується з якорем
            anchor: { x: 0, y: height / 2, z: 0 }, //Точка, навколо якої обертається камера (якір)
            isLookUp: false, //чи піднімається якір, коли камера опускається нижче minHeight (Щоб не бачити низ моделі)
            sensitiveZoom: 0.15, //Чутливість збільшення
        });

        this.distToCam = distance;

        function findCameraDist(cameraAspect, vFov, objWidth, objHeight, objDepth) {
            function distToFitSizeInView(size, fov) {
                return size / (2 * Math.tan(fov / 2));
            }

            const k = 0.8;
            const objAspect = objWidth / objHeight;
            const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cameraAspect);

            const diametr = Math.sqrt(objWidth ** 2 + objHeight ** 2 + objDepth ** 2);

            const dist =
                objAspect < cameraAspect
                    ? distToFitSizeInView(diametr, vFov)
                    : distToFitSizeInView(diametr, hFov);

            return dist + objDepth * cameraAspect * k;
        }
    }

    placeModel(id, settings, callback) {
        R2D.scene.placeObject(id, settings).then((sceneObject) => {
            this.materialsOnModelMap = new Map();
            const materials = sceneObject.objectData.source.body.materials;

            materials.forEach((material) => {
                const id = material.addMaterial || material.default;
                if (id != 0) this.materialsOnModelMap.set(id, true);
            });

            this.configurator.objectViewer3D =
                R2D.commonSceneHelper.productHelper.findObjectView3dBySceneObject(sceneObject);
            this.configurator.sceneObject = sceneObject;
            this.configurator.model3d = this.configurator.objectViewer3D.object3d;

            if (R2D.Pool3D.isLoaded(id)) {
                onPool3DFinishListener.call(this);
            } else {
                R2D.Pool3D.addEventListener(Event.FINISH, onPool3DFinishListener);
            }
        });

        function onPool3DFinishListener(e) {
            const materialsOnModelIds = Array.from(this.materialsOnModelMap.keys());
            const isAllMaterialsLoaded = materialsOnModelIds.every((id) =>
                R2D.Pool.isProductData(id)
            );

            if (isAllMaterialsLoaded) {
                R2D.Pool3D.removeEventListener(Event.FINISH, onPool3DFinishListener);
                if (callback) callback();
            }
        }
        onPool3DFinishListener = onPool3DFinishListener.bind(this);
    }

    render() {
        R2D.Viewers.getCurrentViewer().rendererUpdate();
    }

    disposeRenderers() {
        R2D.sharedRenderer.disposeWebGLRenderers();
    }

    configurateParametric() {
        R2D.Tool.ps.configurate(this.configurator.objectViewer3D);
    }

    clearParametricScaler() {
        R2D.Tool.ps.clear();
    }
}
