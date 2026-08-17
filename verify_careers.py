from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.goto('file:///C:/Users/s0cRAT3s/lake.group.web/careers.html')
    page.wait_for_load_state('networkidle')

    # Check for any iframes
    iframes = page.locator('iframe').count()
    fs_videos = page.locator('.fs-video').count()
    life_at = page.locator('text=Life at Lake Group').count()
    one_team = page.locator('text=One Team, One Rhythm').count()

    print(f'iframes: {iframes}')
    print(f'fs-video: {fs_videos}')
    print(f'"Life at Lake Group": {life_at}')
    print(f'"One Team, One Rhythm": {one_team}')

    # Take a full-page screenshot
    page.screenshot(path='C:/Users/s0cRAT3s/lake.group.web/_careers_check.png', full_page=True)

    # Scroll to the area where the video used to be
    page.evaluate("document.getElementById('apply').scrollIntoView({block: 'start'})")
    page.wait_for_timeout(500)
    page.screenshot(path='C:/Users/s0cRAT3s/lake.group.web/_careers_apply.png')

    browser.close()
