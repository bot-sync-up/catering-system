import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '@field-ops/ui';

export const Tab = createBottomTabNavigator();

export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: theme.colors.primary,
  tabBarInactiveTintColor: theme.colors.muted,
  tabBarStyle: {
    backgroundColor: theme.colors.card,
    borderTopColor: theme.colors.border,
  },
};
