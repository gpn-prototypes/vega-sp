import React from 'react';
import { presetGpnDark, Theme } from '@gpn-design/uikit/Theme';

import { AuthPage } from './pages/auth';

import './App.css';

export const App = (): React.ReactElement => (
  <Theme className="App" preset={presetGpnDark}>
    <AuthPage />
  </Theme>
);
