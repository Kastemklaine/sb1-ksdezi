import { Application } from '@nativescript/core';
import { AppContainer } from './components/AppContainer';

Application.run({ create: () => new AppContainer() });