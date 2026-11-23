import { describe, expect, it, vi } from 'vitest';
import {
  checkCompatibility,
  ensureReadPermission,
  FileGoneError,
  readLinkedFile,
} from './file-access';

function handle(query: PermissionState, request: PermissionState = 'granted') {
  return {
    queryPermission: vi.fn(async () => query),
    requestPermission: vi.fn(async () => request),
  } as unknown as FileSystemHandle & {
    queryPermission: ReturnType<typeof vi.fn>;
    requestPermission: ReturnType<typeof vi.fn>;
  };
}

describe('permisos de lectura', () => {
  it('no pide permiso si ya está concedido', async () => {
    const h = handle('granted');
    expect(await ensureReadPermission(h, true)).toBe(true);
    expect(h.requestPermission).not.toHaveBeenCalled();
  });

  it('pide permiso solo si se indica (gesto del usuario)', async () => {
    const h = handle('prompt');
    expect(await ensureReadPermission(h, false)).toBe(false);
    expect(h.requestPermission).not.toHaveBeenCalled();
    expect(await ensureReadPermission(h, true)).toBe(true);
    expect(h.requestPermission).toHaveBeenCalledWith({ mode: 'read' });
  });

  it('devuelve false si el usuario lo deniega', async () => {
    expect(await ensureReadPermission(handle('prompt', 'denied'), true)).toBe(false);
  });
});

describe('readLinkedFile', () => {
  it('convierte NotFoundError en FileGoneError', async () => {
    const h = {
      getFile: async () => {
        throw new DOMException('gone', 'NotFoundError');
      },
    } as unknown as FileSystemFileHandle;
    await expect(readLinkedFile(h)).rejects.toBeInstanceOf(FileGoneError);
  });
});

describe('checkCompatibility', () => {
  it('clasifica por extensión y canPlayType', () => {
    expect(checkCompatibility('a.mp4')).toBe('supported');
    expect(checkCompatibility('a.webm')).toBe('supported');
    expect(checkCompatibility('a.avi')).toBe('unsupported');
    expect(checkCompatibility('a.mkv', () => '')).toBe('uncertain');
    expect(checkCompatibility('a.mkv', () => 'probably')).toBe('supported');
    expect(checkCompatibility('a.xyz')).toBe('uncertain');
  });
});
