<div dir="rtl">

# תרגיל 3 — יצירת תפקיד מותאם

## מטרה
ליצור תפקיד "Junior Manager" עם הרשאות מצומצמות.

## זמן
15 דקות

## הוראות

1. **Admin ← Roles ← + New Role**
2. שם: `junior_manager`
3. תיאור: "מנהל זוטר — קריאה בלבד לדוחות + עריכת הזמנות"
4. הגדר Permissions:
   - Customers: `view`, `create`
   - Orders: `view`, `create`, `edit` (לא `delete`)
   - Menus: `view`
   - Payments: `view` (לא `refund`)
   - Reports: `view` (לא `export`)
5. שמור
6. צור משתמש חדש "מתן רוזן" עם תפקיד זה
7. התחבר כ-"מתן" וודא שאין לו גישה למסכים מוגבלים

## קריטריון הצלחה
- ניסיון מחיקת הזמנה מציג: "Access Denied"
- ניסיון ייצוא דוח מציג כפתור מנוטרל
- יצירת לקוח חדש עובדת

</div>
