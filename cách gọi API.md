# Cách gọi API

Chạy server: `npm install` rồi `npm start` → mở `http://localhost:3000`.

Tất cả API đều bắt đầu bằng `/api`:

| Method | Đường dẫn | Dùng để |
| --- | --- | --- |
| `GET` | `/api/ingredients` | Lấy danh sách nguyên liệu để hiện ô chọn |
| `POST` | `/api/recipes/match` | Gửi nguyên liệu đang có, nhận về các món nấu được |
| `GET` | `/api/recipes` | Lấy tất cả món (có thể lọc) |
| `GET` | `/api/recipes/:id` | Lấy 1 món theo id, ví dụ `/api/recipes/r001` |

Ai đổi tên đường dẫn hay tên field thì sửa file này và báo cả nhóm nhé.

---

## 1. Lấy danh sách nguyên liệu

```js
const res = await fetch("/api/ingredients");
const data = await res.json();
```

Kết quả:

```json
{
  "groups": [
    {
      "id": "proteins",
      "label": "Proteins",
      "ingredients": [
        { "value": "egg", "label": "Eggs" }
      ]
    }
  ]
}
```

- `label`: chữ hiện cho người dùng xem.
- `value`: chữ gửi lên khi tìm món (xem mục 2).

## 2. Tìm món theo nguyên liệu

```js
const res = await fetch("/api/recipes/match", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ingredients: ["egg", "tomato"] }),
});
const recipes = await res.json();
```

Kết quả là một mảng món, món hợp nhất đứng đầu. Mỗi món có đủ thông tin như mục 3, cộng thêm:

```json
{
  "id": "r019",
  "name": "French Omelette",
  "matchPercent": 50,
  "missing": [
    { "name": "butter", "quantity": "1 tbsp", "optional": false }
  ],
  "score": 45
}
```

- `matchPercent`: có bao nhiêu % nguyên liệu cần thiết.
- `missing`: những nguyên liệu còn thiếu.
- Món nào 0% thì không trả về.

## 3. Lấy món ăn

```js
fetch("/api/recipes");                                  - là tất cả món
fetch("/api/recipes?difficulty=easy&maxTime=20");       - là lọc
fetch("/api/recipes/r001");                             - là gọi 1 món
```

Các bộ lọc (không bắt buộc, dùng cái nào cũng được):

- `cuisine`: viết thường, ví dụ `vietnamese`, `italian`
- `maxTime`: số phút tối đa
- `difficulty`: `easy`, `medium` hoặc `hard`

Một món trông như thế này:

```json
{
  "id": "r001",
  "name": "Tomato Fried Eggs",
  "image": "https://www.themealdb.com/images/media/meals/rwvw8q1765660071.jpg",
  "cookTime": 15,
  "difficulty": "easy",
  "cuisine": "vietnamese",
  "servings": 2,
  "ingredients": [
    { "name": "egg", "quantity": "3", "optional": false },
    { "name": "tomato", "quantity": "2", "optional": false }
  ],
  "steps": ["Beat the eggs...", "Fry the aromatics..."]
}
```

`optional: true` là nguyên liệu không có cũng được, không tính vào `matchPercent`.

## Khi có lỗi

Server trả về `{ "error": "..." }` kèm mã lỗi:

- `400`: gửi sai dữ liệu (ví dụ `ingredients` không phải mảng, `maxTime` không phải số)
- `404`: không có món với id đó
- `500`: lỗi server

## Chưa chạy được server?

Có thể dùng tạm file `mock-data.json` (có sẵn `ingredients` và `recipes`) để làm giao diện trước.
