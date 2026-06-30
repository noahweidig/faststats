import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        file_path = f"file://{os.path.abspath('docs/index.html')}"
        await page.goto(file_path)

        await page.locator(".badge").screenshot(path="screenshot_after_badge.png")

        await page.locator(".btn-primary").focus()
        await page.screenshot(path="screenshot_after_focus.png")

        await browser.close()

asyncio.run(main())
