import { get, set } from 'idb-keyval';

const STORAGE_KEY = 'marktex-workspace';

export interface SerializableFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  // For images: store as base64 data URL
  base64?: string;
  children?: SerializableFile[];
}

export interface WorkspaceData {
  files: SerializableFile[];
  currentFile: string;
  timestamp: number;
}

/**
 * Convert a Blob to base64 data URL for storage
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 data URL to Blob
 */
function base64ToBlob(base64: string): Blob {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Serialize files tree for storage (convert Blob URLs to base64)
 */
export async function serializeFiles(
  files: any[],
  fileSystem: Record<string, any>
): Promise<SerializableFile[]> {
  const serialized: SerializableFile[] = [];

  for (const file of files) {
    const serializedFile: SerializableFile = {
      id: file.id,
      name: file.name,
      type: file.type,
      content: file.content,
    };

    // If it's an image/asset with a blob URL, convert to base64
    if (file.blob && file.blob.startsWith('blob:')) {
      try {
        const fileData = fileSystem[file.id];
        if (fileData?.blob) {
          // Fetch the blob and convert to base64
          const response = await fetch(fileData.blob);
          const blob = await response.blob();
          serializedFile.base64 = await blobToBase64(blob);
        }
      } catch (error) {
        console.error(`Failed to serialize blob for ${file.id}:`, error);
      }
    }

    // Recursively serialize children
    if (file.children) {
      serializedFile.children = await serializeFiles(file.children, fileSystem);
    }

    serialized.push(serializedFile);
  }

  return serialized;
}

/**
 * Deserialize files tree from storage (regenerate Blob URLs from base64)
 */
export function deserializeFiles(
  serialized: SerializableFile[]
): { files: any[]; fileSystem: Record<string, any> } {
  const files: any[] = [];
  const fileSystem: Record<string, any> = {};

  function processNode(node: SerializableFile): any {
    const file: any = {
      id: node.id,
      name: node.name,
      type: node.type,
      content: node.content,
    };

    // If there's base64 data, regenerate blob URL
    if (node.base64) {
      try {
        const blob = base64ToBlob(node.base64);
        const blobUrl = URL.createObjectURL(blob);
        file.blob = blobUrl;
        file.content = blobUrl;

        // Add to file system
        fileSystem[node.id] = {
          id: node.id,
          content: blobUrl,
          blob: blobUrl,
        };
      } catch (error) {
        console.error(`Failed to deserialize blob for ${node.id}:`, error);
      }
    } else if (node.content) {
      // For text files (like main.md), add to file system
      fileSystem[node.id] = {
        id: node.id,
        content: node.content,
      };
    }

    // Recursively process children
    if (node.children) {
      file.children = node.children.map(processNode);
    }

    return file;
  }

  for (const node of serialized) {
    files.push(processNode(node));
  }

  return { files, fileSystem };
}

/**
 * Save workspace to IndexedDB
 */
export async function saveWorkspace(
  files: any[],
  fileSystem: Record<string, any>,
  currentFile: string
): Promise<void> {
  try {
    const serializedFiles = await serializeFiles(files, fileSystem);
    const data: WorkspaceData = {
      files: serializedFiles,
      currentFile,
      timestamp: Date.now(),
    };
    await set(STORAGE_KEY, data);
  } catch (error) {
    console.error('Failed to save workspace:', error);
    throw error;
  }
}

/**
 * Load workspace from IndexedDB
 */
export async function loadWorkspace(): Promise<WorkspaceData | null> {
  try {
    const data = await get<WorkspaceData>(STORAGE_KEY);
    return data || null;
  } catch (error) {
    console.error('Failed to load workspace:', error);
    return null;
  }
}

/**
 * Clear workspace from IndexedDB
 */
export async function clearWorkspace(): Promise<void> {
  try {
    await set(STORAGE_KEY, undefined);
  } catch (error) {
    console.error('Failed to clear workspace:', error);
  }
}
