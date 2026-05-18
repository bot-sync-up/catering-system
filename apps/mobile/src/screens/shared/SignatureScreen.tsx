import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import SignatureView from 'react-native-signature-canvas';
import { Screen, Text, Button, Card } from '@field-ops/ui';
import { useTranslation } from 'react-i18next';
import { database } from '../../db';
import { SignatureModel } from '../../db/models/Signature';

export function SignatureScreen() {
  const { t } = useTranslation();
  const ref = useRef<any>(null);
  const [saved, setSaved] = useState(false);

  const onOK = async (signature: string) => {
    await database.write(async () => {
      await database.get<SignatureModel>('signatures').create((s) => {
        s.parentType = 'delivery';
        s.parentId = `local_${Date.now()}`;
        s.dataUrl = signature;
        (s as any).createdAt = new Date();
        s.isDirty = true;
      });
    });
    setSaved(true);
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>
          {t('signature.title')}
        </Text>
      </View>
      <View style={styles.box}>
        <SignatureView
          ref={ref}
          onOK={onOK}
          descriptionText=""
          clearText={t('signature.clear')}
          confirmText={t('signature.save')}
          webStyle={`.m-signature-pad--footer { display: flex; }`}
        />
      </View>
      {saved && (
        <Card>
          <Text>{t('app.synced')}</Text>
          <Button title={t('signature.clear')} onPress={() => setSaved(false)} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { height: 360, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
});
