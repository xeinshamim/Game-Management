import React from 'react';
import { Icon } from 'react-native-elements';

interface TabBarIconProps {
  route: string;
  focused: boolean;
  color: string;
  size: number;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ route, focused, color, size }) => {
  const getIconName = (routeName: string): string => {
    switch (routeName) {
      case 'Home':
        return 'home';
      case 'Tournaments':
        return 'trophy';
      case 'Matches':
        return 'game-controller';
      case 'Friends':
        return 'people';
      case 'Leaderboard':
        return 'list';
      case 'Wallet':
        return 'wallet';
      case 'Notifications':
        return 'bell';
      case 'Offline':
        return 'wifi-off';
      case 'Profile':
        return 'person';
      default:
        return 'help-circle';
    }
  };

  return (
    <Icon
      name={getIconName(route)}
      type="ionicon"
      size={size}
      color={color}
    />
  );
};

export default TabBarIcon;
