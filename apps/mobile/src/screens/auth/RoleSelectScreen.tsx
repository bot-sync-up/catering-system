import React from 'react';
import { Screen, Text, Button, Card } from '@field-ops/ui';
import { useTranslation } from 'react-i18next';
import { setRole } from '../../services/auth';
import type { Role } from '../../types';

const ROLES: Role[] = ['manager', 'agent', 'kitchen', 'shift', 'driver', 'customer'];

export function RoleSelectScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>
        {t('auth.selectRole')}
      </Text>
      <Card>
        {ROLES.map((r) => (
          <Button
            key={r}
            title={t(`roles.${r}`)}
            onPress={() => setRole(r)}
            variant="secondary"
          />
        ))}
      </Card>
    </Screen>
  );
}
