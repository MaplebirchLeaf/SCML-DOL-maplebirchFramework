# 食物注册

用于向原版 **`setup.foodstuff`** 添加新的食材、菜品、饮品或可种植物。

## 使用入口

```javascript
maplebirch.tool.patch.addFoodstuff(key, config);
```

**`key`** 是食物的唯一标识，建议带模组名前缀，避免和原版或其他模组冲突。

## 最小示例

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

## 常用字段

| 字段                     | 说明                                   | 默认值                  |
| :----------------------- | :------------------------------------- | :---------------------- |
| `index`                  | 原版食物索引，不填时自动生成           | 自动                    |
| `name`                   | 显示名称                               | 由 key 转换             |
| `singular`               | 单数名称                               | `name`                  |
| `plural`                 | 复数名称                               | `name + "s"`            |
| `icon`                   | 图标文件名                             | `${key}.png`            |
| `category`               | 分类，如 `fruit`、`ingredient`、`dish` | `ingredient`            |
| `kitchen_item_type_icon` | 厨房分类图标                           | `recipe-ingredient.png` |
| `prop_folder`            | prop 图片目录                          | `ingredient`            |
| `shop.sell_price`        | 售价                                   | `0`                     |
| `shop.available_in`      | 可购买商店，如 `["supermarket"]`       | -                       |
| `recipe`                 | 菜谱配置                               | -                       |
| `food.tags`              | 食物标签，如 `vegan`、`drink`、`sweet` | -                       |
| `tending`                | 种植配置                               | -                       |

## boot.json

对象映射写法，_推荐用于一次注册多个条目_：

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

也可以引用 **`.json`**、**`.yaml`** 或 **`.yml`** 文件。文件内部可以使用同样的对象映射格式：

```json
{
  "framework": {
    "foodstuff": "data/foodstuff.yaml"
  }
}
```

数组写法也支持，但每一项必须带 **`key`**：

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
