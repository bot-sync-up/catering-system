import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen, Text, Button, Card } from '@field-ops/ui';
import { useTranslation } from 'react-i18next';
import { database } from '../../db';
import { PhotoModel } from '../../db/models/Photo';
import { api } from '../../services/api';

/**
 * Capture a photo, store locally with queued=true. When connectivity is up
 * the sync engine uploads it; for OCR we send the local URI to the server
 * which returns extracted text (best for scanned receipts/IDs).
 */
export function CameraOcrScreen({ taskId }: { taskId?: string }) {
  const { t } = useTranslation();
  const camRef = useRef<any>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const [shotUri, setShotUri] = useState<string | null>(null);
  const [ocr, setOcr] = useState<string | null>(null);

  if (!perm) return null;
  if (!perm.granted) {
    return (
      <Screen>
        <Text>{t('errors.noPermission')}</Text>
        <Button title="הענק הרשאה" onPress={requestPerm} />
      </Screen>
    );
  }

  const capture = async () => {
    const r = await camRef.current?.takePictureAsync({ quality: 0.7 });
    if (!r?.uri) return;
    setShotUri(r.uri);
    const photo = await database.write(async () => {
      return database.get<PhotoModel>('photos').create((p) => {
        p.taskId = taskId;
        p.localUri = r.uri;
        p.queued = true;
        p.uploaded = false;
        (p as any).createdAt = new Date();
        (p as any).updatedAt = new Date();
        p.isDirty = true;
      });
    });
    // Best-effort OCR (server-side). Offline -> queue stays.
    try {
      const form = new FormData();
      form.append('photo', { uri: r.uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
      const res = await api.post('/ocr', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const text = res.data?.text as string | undefined;
      if (text) {
        setOcr(text);
        await database.write(async () => {
          await photo.update((p) => {
            p.ocrText = text;
          });
        });
      }
    } catch {
      // queued; handled by sync
    }
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.cam}>
        <CameraView ref={camRef} style={StyleSheet.absoluteFillObject} />
      </View>
      <View style={{ padding: 16 }}>
        <Card>
          <Button title={t('tasks.addPhoto')} onPress={capture} />
          {shotUri && <Text>נשמר: {shotUri.slice(-40)}</Text>}
          {ocr && <Text>OCR: {ocr}</Text>}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cam: { height: 360, marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden' },
});
