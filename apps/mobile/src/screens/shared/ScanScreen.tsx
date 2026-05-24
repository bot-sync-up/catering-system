import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Screen, Text, Button, Card } from '@field-ops/ui';
import { useTranslation } from 'react-i18next';

export function ScanScreen() {
  const { t } = useTranslation();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await BarCodeScanner.requestPermissionsAsync();
      setGranted(r.status === 'granted');
    })();
  }, []);

  if (granted === null) return null;
  if (!granted) {
    return (
      <Screen>
        <Text>{t('errors.noPermission')}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.scanner}>
        <BarCodeScanner
          onBarCodeScanned={
            scanned ? undefined : ({ data }) => setScanned(data)
          }
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View style={{ padding: 16 }}>
        <Card>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>
            {t('scan.title')}
          </Text>
          {scanned && <Text>{t('scan.scanned', { value: scanned })}</Text>}
          <Button title={t('app.cancel')} onPress={() => setScanned(null)} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scanner: { height: 320, overflow: 'hidden', borderRadius: 16, margin: 16 },
});
