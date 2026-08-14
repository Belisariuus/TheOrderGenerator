import base64
import sys
import os
from pathlib import Path

def docx_to_base64(file_path: str) -> str:
    """Читает .docx и возвращает Base64-строку."""
    file_path = Path(file_path)
    if not file_path.is_file():
        raise FileNotFoundError(f"Файл '{file_path}' не найден.")
    with open(file_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')

def save_base64_to_txt(base64_str: str, output_path: str) -> None:
    """Сохраняет Base64-строку в текстовый файл."""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(base64_str)

if __name__ == "__main__":
    input_docx = os.path.join(os.getcwd(), "templates", "TemplateOrderChangeAudit2026.docx")
    output_txt = "ss1.txt"


    try:
        print(f"Чтение файла: {input_docx}")
        b64_string = docx_to_base64(input_docx)
        print(f"Сохранение в: {output_txt}")
        save_base64_to_txt(b64_string, output_txt)
        print("Готово!")
    except Exception as e:
        print(f"Ошибка: {e}")
        sys.exit(1)