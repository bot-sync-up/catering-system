import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Screen, Text, Input, Button, Card } from '@field-ops/ui';
import { useTranslation } from 'react-i18next';
import { loginWithPhone, biometricUnlock } from '../../services/auth';

export function LoginScreen() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    setBusy(true);
    try {
      const ok = await biometricUnlock();
      if (!ok) {
        Alert.alert(t('errors.generic'), t('auth.biometric'));
      }
      await loginWithPhone(phone, code);
    } catch (e: any) {
      Alert.alert(t('errors.generic'), e?.message ?? '');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>{t('auth.login')}</Text>
      <Card>
        <Text>{t('auth.phone')}</Text>
        <Input
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="05X-XXXXXXX"
        />
        <Text>{t('auth.code')}</Text>
        <Input
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <Button title={t('auth.login')} onPress={onLogin} loading={busy} />
        <Button
          title={t('auth.biometric')}
          variant="ghost"
          onPress={biometricUnlock}
        />
      </Card>
    </Screen>
  );
}
