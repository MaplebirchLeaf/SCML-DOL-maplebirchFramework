# Foodstuff

Foodstuff registration adds new ingredients, dishes, drinks, or growable items to vanilla **`setup.foodstuff`**.

## Entry Point

```javascript
maplebirch.tool.patch.addFoodstuff(key, config);
```

**`key`** is the unique foodstuff id. Use a mod prefix to avoid collisions.

## Minimal Example

```javascript
maplebirch.tool.patch.addFoodstuff('my_mod_berry', {
  name: 'strange berry',
  singular: 'strange berry',
  plural: 'strange berries',
  category: 'fruit',
  icon: 'my-mod-berry.png',
  shop: {
    sell_price: 80
  }
});
```

## Common Fields

| Field | Description | Default |
| :--- | :--- | :--- |
| `index` | Vanilla foodstuff index | Auto |
| `name` | Display name | Derived from key |
| `singular` | Singular name | `name` |
| `plural` | Plural name | `name + "s"` |
| `icon` | Icon filename | `${key}.png` |
| `category` | Category such as `fruit`, `ingredient`, or `dish` | `ingredient` |
| `kitchen_item_type_icon` | Kitchen category icon | `recipe-ingredient.png` |
| `prop_folder` | Prop image folder | `ingredient` |
| `shop.sell_price` | Sell price | `0` |
| `shop.available_in` | Shops where it can appear, such as `["supermarket"]` | - |
| `recipe` | Recipe config | - |
| `food.tags` | Food tags such as `vegan`, `drink`, or `sweet` | - |
| `tending` | Growable item config | - |

## Dish Example

```javascript
maplebirch.tool.patch.addFoodstuff('my_mod_soup', {
  name: 'herbal soup',
  singular: 'serving of herbal soup',
  plural: 'servings of herbal soup',
  category: 'dish',
  kitchen_item_type_icon: 'recipe-food.png',
  prop_folder: 'food',
  shop: {
    sell_price: 500
  },
  recipe: {
    recipe_name: 'herbal soup',
    difficulty: 1,
    cook_minutes: 20,
    servings: 1,
    ingredients: ['wild_carrot', 'salt'],
    tags: []
  },
  food: {
    tags: ['vegan']
  }
});
```

## boot.json

Object-map form. _This is the recommended format when registering multiple entries._

```json
{
  "framework": {
    "foodstuff": {
      "my_mod_berry": {
        "name": "strange berry",
        "category": "fruit",
        "shop": {
          "sell_price": 80
        }
      },
      "my_mod_soup": {
        "name": "herbal soup",
        "category": "dish",
        "kitchen_item_type_icon": "recipe-food.png",
        "prop_folder": "food",
        "shop": {
          "sell_price": 500
        },
        "recipe": {
          "recipe_name": "herbal soup",
          "difficulty": 1,
          "cook_minutes": 20,
          "servings": 1,
          "ingredients": ["wild_carrot", "salt"],
          "tags": []
        }
      }
    }
  }
}
```

External **`.json`**, **`.yaml`**, or **`.yml`** file. The file can use the same object-map format:

```json
{
  "framework": {
    "foodstuff": "data/foodstuff.yaml"
  }
}
```

Array form is also supported. Each item must include **`key`**:

```yaml
- key: my_mod_berry
  name: strange berry
  category: fruit
  shop:
    sell_price: 80
- key: my_mod_soup
  name: herbal soup
  category: dish
  kitchen_item_type_icon: recipe-food.png
  prop_folder: food
  shop:
    sell_price: 500
  recipe:
    recipe_name: herbal soup
    difficulty: 1
    cook_minutes: 20
    servings: 1
    ingredients:
      - wild_carrot
      - salt
    tags: []
```
