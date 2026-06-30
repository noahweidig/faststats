import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # Get absolute path to docs/index.html
        file_path = f"file://{os.path.abspath('docs/index.html')}"
        await page.goto(file_path)
        await page.screenshot(path="screenshot_before.png")
        await browser.close()

asyncio.run(main())
