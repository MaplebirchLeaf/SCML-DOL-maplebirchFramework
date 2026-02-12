// ./src/modules/NamedNPCAddon/NPCSiderbarConfig/hands_layers.ts

import { clothes_layer, clothes_hand } from './functions';

const hands_layers = {
  nnpc_hands_main: clothes_layer('hands', 'main'),
  nnpc_hands_left: clothes_hand('left', 'main'),
  nnpc_hands_left_acc: clothes_hand('left', 'acc'),
  nnpc_hands_left_detail: clothes_hand('left', 'detail'),
  nnpc_hands_right: clothes_hand('right', 'main'),
  nnpc_hands_right_acc: clothes_hand('right', 'acc'),
  nnpc_hands_right_detail: clothes_hand('right', 'detail'),
}

export default hands_layers