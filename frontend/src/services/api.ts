const API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  ? `${process.env.REACT_APP_API_BASE_URL}/api`
  : "http://localhost:5001/api";
  
export interface ImageResponse {
  id: string;
  file_name: string;
  url: string;
  width: number;
  height: number;
  annotation_count: number;
  created_at: string;
}

export interface AnnotationResponse {
  id: string;
  image_id: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  label: string;
  created_at: string;
}

class ApiService {
  async getAllImages(): Promise<ImageResponse[]> {
    const response = await fetch(`${API_BASE_URL}/images`);
    const data = await response.json();
    return data.data;
  }

  async getImageById(
    id: string
  ): Promise<ImageResponse & { annotations: AnnotationResponse[] }> {
    const response = await fetch(`${API_BASE_URL}/images/${id}`);
    const data = await response.json();
    return data.data;
  }

  async uploadImage(file: File): Promise<ImageResponse> {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_BASE_URL}/images`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    return data.data;
  }

  async deleteImage(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/images/${id}`, {
      method: "DELETE",
    });
  }

  async createAnnotation(
    imageId: string,
    annotation: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      label: string;
    }
  ): Promise<AnnotationResponse> {
    const response = await fetch(
      `${API_BASE_URL}/images/${imageId}/annotations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(annotation),
      }
    );
    const data = await response.json();
    return data.data;
  }

  async updateAnnotation(
    id: string,
    updates: { label?: string }
  ): Promise<AnnotationResponse> {
    const response = await fetch(`${API_BASE_URL}/annotations/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    return data.data;
  }

  async deleteAnnotation(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/annotations/${id}`, {
      method: "DELETE",
    });
  }

  async createBatchAnnotations(
    imageId: string,
    annotations: Array<{
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      label: string;
    }>
  ): Promise<AnnotationResponse[]> {
    const response = await fetch(
      `${API_BASE_URL}/images/${imageId}/annotations/batch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ annotations }),
      }
    );
    const data = await response.json();
    return data.data;
  }

  async replaceAllAnnotations(
    imageId: string,
    annotations: Array<{
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      label: string;
    }>
  ): Promise<AnnotationResponse[]> {
    const response = await fetch(
      `${API_BASE_URL}/images/${imageId}/annotations`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ annotations }),
      }
    );
    const data = await response.json();
    return data.data;
  }
}

export const apiService = new ApiService();
