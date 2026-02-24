import { addons } from 'storybook/internal/manager-api';
import { create } from 'storybook/internal/theming';

const theme = create({
  base: 'light',
  brandTitle: 'Cedros Pay',
  brandUrl: 'https://github.com/conorholds/cedros-pay',
  brandTarget: '_self',
});

addons.setConfig({
  theme,
});
