import { create } from "zustand";
import { ImageData, Box, generateRandomColor } from "../types";
import toast from "react-hot-toast";
import { apiService } from "../services/api";

interface AnnotationStore {
  images: ImageData[];
  currentImageIndex: number;
  imageHistories: Map<string, { history: Box[][]; historyIndex: number }>;
  isLoading: boolean;

  getCurrentImage: () => ImageData | null;
  getAnnotations: () => Box[];

  loadImages: () => Promise<void>;
  addImage: (file: File) => Promise<void>;
  selectImage: (index: number) => void;
  deleteImage: (index: number) => Promise<void>;
  setAnnotations: (annotations: Box[]) => void;
  saveAnnotations: () => Promise<void>;
  deleteAnnotation: (index: number) => Promise<void>;
  updateLabel: (index: number, newLabel: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  exportJSON: () => void;
}

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  images: [],
  currentImageIndex: -1,
  imageHistories: new Map(),
  isLoading: false,

  getCurrentImage: () => {
    const state = get();
    return state.currentImageIndex >= 0
      ? state.images[state.currentImageIndex]
      : null;
  },

  getAnnotations: () => {
    const state = get();
    const currentImage =
      state.currentImageIndex >= 0
        ? state.images[state.currentImageIndex]
        : null;
    return currentImage?.annotations || [];
  },

  loadImages: async () => {
    set({ isLoading: true });
    try {
      const serverImages = await apiService.getAllImages();

      const images: ImageData[] = serverImages.map((img) => ({
        id: img.id,
        url: img.url,
        fileName: img.file_name,
        annotations: [],
      }));

      const newHistories = new Map();
      images.forEach((img) => {
        newHistories.set(img.id, {
          history: [[]],
          historyIndex: 0,
        });
      });

      set({
        images,
        currentImageIndex: images.length > 0 ? 0 : -1,
        imageHistories: newHistories,
        isLoading: false,
      });
    } catch (error) {
      toast.error("Failed to load images");
      set({ isLoading: false });
    }
  },

  addImage: async (file: File) => {
    set({ isLoading: true });
    try {
      const serverImage = await apiService.uploadImage(file);

      const newImage: ImageData = {
        id: serverImage.id,
        url: serverImage.url,
        fileName: serverImage.file_name,
        annotations: [],
      };

      set((state) => {
        const newHistories = new Map(state.imageHistories);
        newHistories.set(newImage.id, {
          history: [[]],
          historyIndex: 0,
        });

        toast.success(`Added: ${file.name}`);
        return {
          images: [...state.images, newImage],
          currentImageIndex: state.images.length,
          imageHistories: newHistories,
          isLoading: false,
        };
      });
    } catch (error) {
      toast.error("Failed to upload image");
      set({ isLoading: false });
    }
  },

  selectImage: async (index) => {
    const state = get();
    const image = state.images[index];

    if (!image) return;

    try {
      const serverImage = await apiService.getImageById(image.id);

      const annotations: Box[] = serverImage.annotations.map((ann) => ({
        startX: ann.start_x,
        startY: ann.start_y,
        endX: ann.end_x,
        endY: ann.end_y,
        label: ann.label,
        color: generateRandomColor(),
      }));

      set((state) => {
        const newImages = [...state.images];
        newImages[index] = {
          ...newImages[index],
          annotations,
        };

        const newHistories = new Map(state.imageHistories);
        newHistories.set(image.id, {
          history: [annotations],
          historyIndex: 0,
        });

        return {
          images: newImages,
          currentImageIndex: index,
          imageHistories: newHistories,
        };
      });
    } catch (error) {
      toast.error("Failed to load annotations");
      set({ currentImageIndex: index });
    }
  },

  deleteImage: async (index) => {
    const state = get();
    const deletedImage = state.images[index];

    try {
      await apiService.deleteImage(deletedImage.id);

      set((state) => {
        const newImages = state.images.filter((_, i) => i !== index);
        let newIndex = state.currentImageIndex;

        if (index === state.currentImageIndex) {
          newIndex =
            newImages.length > 0 ? Math.min(index, newImages.length - 1) : -1;
        } else if (index < state.currentImageIndex) {
          newIndex = state.currentImageIndex - 1;
        }

        const newHistories = new Map(state.imageHistories);
        newHistories.delete(deletedImage.id);

        toast.success(`Deleted: ${deletedImage.fileName}`);

        return {
          images: newImages,
          currentImageIndex: newIndex,
          imageHistories: newHistories,
        };
      });
    } catch (error) {
      toast.error("Failed to delete image");
    }
  },

  setAnnotations: (annotations) => {
    set((state) => {
      if (state.currentImageIndex === -1) return state;

      const currentImage = state.images[state.currentImageIndex];
      const imageId = currentImage.id;

      const currentHistory = state.imageHistories.get(imageId) || {
        history: [[]],
        historyIndex: 0,
      };

      const newImages = [...state.images];
      newImages[state.currentImageIndex] = {
        ...newImages[state.currentImageIndex],
        annotations,
      };

      const newHistory = [
        ...currentHistory.history.slice(0, currentHistory.historyIndex + 1),
        annotations,
      ];

      const newHistories = new Map(state.imageHistories);
      newHistories.set(imageId, {
        history: newHistory,
        historyIndex: currentHistory.historyIndex + 1,
      });

      return {
        images: newImages,
        imageHistories: newHistories,
      };
    });
  },

  saveAnnotations: async () => {
    const state = get();
    const currentImage = state.getCurrentImage();
    if (!currentImage) return;

    const annotations = state.getAnnotations();

    try {
      const annotationsData = annotations.map((box) => ({
        startX: box.startX,
        startY: box.startY,
        endX: box.endX,
        endY: box.endY,
        label: box.label,
      }));

      await apiService.replaceAllAnnotations(currentImage.id, annotationsData);
    } catch (error) {
      console.error("Failed to save annotations:", error);
    }
  },

  deleteAnnotation: async (index) => {
    const state = get();
    if (state.currentImageIndex === -1) return;

    const currentImage = state.images[state.currentImageIndex];
    const annotations = currentImage.annotations || [];
    const boxLabel = annotations[index]?.label || "Box";

    set((state) => {
      const currentImage = state.images[state.currentImageIndex];
      const annotations = currentImage.annotations || [];
      const imageId = currentImage.id;

      const currentHistory = state.imageHistories.get(imageId) || {
        history: [[]],
        historyIndex: 0,
      };

      const newAnnotations = annotations.filter((_, i) => i !== index);

      const newImages = [...state.images];
      newImages[state.currentImageIndex] = {
        ...newImages[state.currentImageIndex],
        annotations: newAnnotations,
      };

      const newHistory = [
        ...currentHistory.history.slice(0, currentHistory.historyIndex + 1),
        newAnnotations,
      ];

      const newHistories = new Map(state.imageHistories);
      newHistories.set(imageId, {
        history: newHistory,
        historyIndex: currentHistory.historyIndex + 1,
      });

      toast.success(`${boxLabel} #${index + 1} deleted`);

      return {
        images: newImages,
        imageHistories: newHistories,
      };
    });

    await get().saveAnnotations();
  },

  updateLabel: (index, newLabel) => {
    const state = get();
    const annotations = state.getAnnotations();
    const newAnnotations = [...annotations];
    newAnnotations[index] = { ...newAnnotations[index], label: newLabel };
    state.setAnnotations(newAnnotations);
  },

  canUndo: () => {
    const state = get();
    const currentImage = state.getCurrentImage();
    if (!currentImage) return false;

    const imageHistory = state.imageHistories.get(currentImage.id);
    return imageHistory ? imageHistory.historyIndex > 0 : false;
  },

  canRedo: () => {
    const state = get();
    const currentImage = state.getCurrentImage();
    if (!currentImage) return false;

    const imageHistory = state.imageHistories.get(currentImage.id);
    return imageHistory
      ? imageHistory.historyIndex < imageHistory.history.length - 1
      : false;
  },

  undo: () => {
    set((state) => {
      const currentImage = state.getCurrentImage();
      if (!currentImage) return state;

      const imageHistory = state.imageHistories.get(currentImage.id);
      if (!imageHistory || imageHistory.historyIndex <= 0) return state;

      const newIndex = imageHistory.historyIndex - 1;
      const annotations = imageHistory.history[newIndex];

      const newImages = [...state.images];
      newImages[state.currentImageIndex] = {
        ...newImages[state.currentImageIndex],
        annotations,
      };

      const newHistories = new Map(state.imageHistories);
      newHistories.set(currentImage.id, {
        ...imageHistory,
        historyIndex: newIndex,
      });

      return {
        images: newImages,
        imageHistories: newHistories,
      };
    });
    setTimeout(() => {
      get().saveAnnotations();
    }, 100);
  },

  redo: () => {
    set((state) => {
      const currentImage = state.getCurrentImage();
      if (!currentImage) return state;

      const imageHistory = state.imageHistories.get(currentImage.id);
      if (
        !imageHistory ||
        imageHistory.historyIndex >= imageHistory.history.length - 1
      ) {
        return state;
      }

      const newIndex = imageHistory.historyIndex + 1;
      const annotations = imageHistory.history[newIndex];

      const newImages = [...state.images];
      newImages[state.currentImageIndex] = {
        ...newImages[state.currentImageIndex],
        annotations,
      };

      const newHistories = new Map(state.imageHistories);
      newHistories.set(currentImage.id, {
        ...imageHistory,
        historyIndex: newIndex,
      });

      return {
        images: newImages,
        imageHistories: newHistories,
      };
    });
    setTimeout(() => {
      get().saveAnnotations();
    }, 100);
  },

  exportJSON: () => {
    const state = get();
    const currentImage = state.getCurrentImage();
    if (!currentImage) return;

    const annotations = state.getAnnotations();
    const annotationsData = annotations.map((box, index) => ({
      id: index + 1,
      label: box.label,
      x: Math.min(box.startX, box.endX),
      y: Math.min(box.startY, box.endY),
      width: Math.abs(box.endX - box.startX),
      height: Math.abs(box.endY - box.startY),
    }));

    const exportData = {
      image: {
        fileName: currentImage.fileName || "image.jpg",
        width: 800,
        height: 600,
      },
      annotations: annotationsData,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    a.download = `annotations_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${annotations.length} annotations`);
  },
}));
