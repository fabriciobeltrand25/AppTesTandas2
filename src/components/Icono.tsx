/** Iconos oficiales de Ionicons (incluidos en Expo, no requiere instalar nada). */
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];
export const Icono = Ionicons;
