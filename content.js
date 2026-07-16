// TVING Watch History Plus - Content Script

(() => {
    'use strict';

    const CONFIG = {
        API_BASE: 'https://api.tving.com/v2/media/my/lasts',
        API_KEY: '1e7952d0917d6aab1f0293a063697610',
        IMAGE_CDN: 'https://image.tving.com',
        PAGE_SIZE: 50,
        BTN_ID: 'watch-history-more-btn',
        AREA_ID: 'watch-history-area',
        GRID_CLASS: 'watch-history-grid',
		HANDLER_SCROLL: null
    };

    const getTokens = (cookieString) => {
        const cookies = cookieString.split(';').reduce((acc, cookie) => {
            const index = cookie.indexOf('=');
            if (index > 0) acc[cookie.substring(0, index).trim()] = cookie.substring(index + 1).trim();
            return acc;
        }, {});
        return { accessToken: cookies['accessToken'] || '', authToken: cookies['authToken'] || '' };
    };

    const fetchWatchHistory = async (pageNo = 1, cookieString) => {
        const {accessToken, authToken} = getTokens(cookieString);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 365);

        const params = new URLSearchParams({
            screenCode: 'CSSD0100',
            networkCode: 'CSND0900',
            osCode: 'CSOD0900',
            teleCode: 'CSCD0900',
            apiKey: CONFIG.API_KEY,
            startDate: startDate.toISOString().slice(0, 10).replace(/-/g, ''),
            pageSize: CONFIG.PAGE_SIZE.toString(),
            order: 'new',
            contentType: 'vod',
            pageNo: pageNo.toString()
        });

        return (await fetch(`${CONFIG.API_BASE}?${params.toString()}`, {
            credentials: 'include',
            headers: {
                'accept': 'application/json',
                'access-token': accessToken,
                'auth-token': authToken
            }
        })).json();
    };

    const parseItem = item => {
        const content = item.content || {};
        const contentCode = item.content_code || '';
        const isMovie = contentCode.startsWith('M');
        const lastPlayTime = parseInt(item.lastPlayTime) || 0;
        const groupId = isMovie ? contentCode : (content.program?.series_code || content.program?.code || contentCode);

        return { content, isMovie, lastPlayTime, groupId, vodCode: content.vod_code || contentCode };
    }

    const mapToDisplayItems = (items) => {
        return items.map(item => {
            const { content, isMovie, lastPlayTime, vodCode } = parseItem(item);
            const programName = isMovie ? (content.movie?.name?.ko || '') : (content.program?.name?.ko || '');
            const episodeName = isMovie ? '' : (content.vod_name?.ko || '');
            const duration = content.episode?.duration || content.movie?.duration || 0;
            const progress = duration > 0 ? Math.min((lastPlayTime / duration) * 100, 100) : 0;
            const rawImage = isMovie
                ? (content.movie?.image?.find(img => img.code === 'CAIM2600')?.url || content.movie?.image?.[0]?.url || '')
                : (content.program?.image?.find(img => img.code === 'CAIP0500')?.url || content.program_horizontal_image || content.episode_image || '');
            const image = rawImage ? `${rawImage}/dims/resize/F_webp,400` : '';
            const isLast = content.last_frequency_yn === 'Y';
            return {
                name: programName,
                episodeName: episodeName !== programName ? episodeName + (!isMovie && isLast ? ' (last)' : '') : '',
                vodCode,
                image,
                lastWatchTime: item.viewDate,
                progress
            };
        });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const str = String(dateStr);
        if (str.length === 14) {
            const d = new Date(parseInt(str.substring(0, 4)), parseInt(str.substring(4, 6)) - 1, parseInt(str.substring(6, 8)));
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
        }
        return '';
    };

    const transDisplayItemToHTMLString = (vod) => {
        const imageUrl = vod.image ? `${CONFIG.IMAGE_CDN}${vod.image}` : '';
        const { name, episodeName, vodCode, progress } = vod;
        const watchTime = formatDate(vod.lastWatchTime);
        return `
            <a href="/contents/${vodCode}" class="group">
                <div class="hover-supported:hover:translate-y-[-0.75rem] group transform transition duration-500 will-change-[transform]">
                    <div class="item__thumb-new-tving-item cursor-pointer item__thumb-new-tving-item-16x9">
                        ${imageUrl ? `<img src="${imageUrl}" alt="${name}" class="atom-poster-img visible" onerror="this.style.display='none'">` : ''}
                        ${progress > 0 ? `<div class="atom-progressBar-wrapper z-30"><div class="atom-progressBar-percent" style="width:${progress}%"></div></div>` : ''}
                    </div>
                    <div class="mt-[0.83rem] cursor-pointer">
                        <p class="truncate text-[1.33333rem] font-bold leading-[1.5] text-white" title="${name}">${name}</p>
                        ${episodeName ? `<p class="truncate text-[1.08333rem] leading-normal text-[#999] mt-[0.35rem]" title="${episodeName}">${episodeName}</p>` : ''}
                        <p class="truncate text-[1.08333rem] leading-normal text-[#999] mt-[0.45rem]">${watchTime} 시청</p>
                    </div>
                </div>
            </a>`;
    };

    const appendDisplayItems = (grid, items) => {
        grid.insertAdjacentHTML('beforeend', items.map(transDisplayItemToHTMLString).join(''));
    };

    const findContentMain = (doc) => {
        return doc.querySelector('.flex > main');
    };

    const loadNextPage = ({cookie}, grid) => {
        let isLoading = false;
        let currentPage = 1;
        let hasMore = true;
        const loadedIds = new Set();

        return async () => {
            if (isLoading || !hasMore || !grid) return false;
            isLoading = true;
            try {
                const response = await fetchWatchHistory(currentPage, cookie);
                if (response.body && response.body.result) {
                    const newItems = response.body.result.filter(item => {
                        const { groupId } = parseItem(item);
                        if (loadedIds.has(groupId)) return false;
                        loadedIds.add(groupId);
                        return true;
                    });
                    hasMore = response.body.has_more === 'Y';
                    if (newItems.length > 0) appendDisplayItems(grid, mapToDisplayItems(newItems));
                    currentPage++;
                }
                return false;
            } catch (error) {
                console.error('[TVING Plus]', error);
                return false;
            } finally {
                isLoading = false;
            }
        };
    };

    const handleScroll = (win, loadPage) => {
        return async () => {
            if (win.innerHeight + win.scrollY >= win.document.body.offsetHeight - 200) {
                await loadPage();
            }
        };
    };

    const showWatchHistory = async (doc) => {
        const area = doc.getElementById(CONFIG.AREA_ID);
        if (!area) return;

        area.innerHTML = '<div class="text-center py-[48px] text-[#b3b3b3]">시청 내역을 불러오는 중...</div>';

        const grid = doc.createElement('div');
        grid.className = CONFIG.GRID_CLASS;
        area.innerHTML = '';
        area.appendChild(grid);

        const loadPage = loadNextPage(doc, grid);
        await loadPage();

        if (grid.children.length === 0) {
            area.innerHTML = '<div class="text-center py-[48px] text-[#808080]">시청 내역이 없습니다.</div>';
        }

        return loadPage;
    };

    const toggleWatchHistory = async (doc, win) => {
        const area = doc.getElementById(CONFIG.AREA_ID);
        const btn = doc.getElementById(CONFIG.BTN_ID);
        if (!area || !btn) return;

        if (area.style.display === 'none' || !area.innerHTML) {
            area.style.display = '';
            btn.classList.add('active');

            if (CONFIG.HANDLER_SCROLL) win.removeEventListener('scroll', CONFIG.HANDLER_SCROLL);
            CONFIG.HANDLER_SCROLL = handleScroll(win, await showWatchHistory(doc));
            win.addEventListener('scroll', CONFIG.HANDLER_SCROLL);
        } else {
            area.style.display = 'none';
            btn.classList.remove('active');

            if (CONFIG.HANDLER_SCROLL) win.removeEventListener('scroll', CONFIG.HANDLER_SCROLL);
        }
    };

    const addMoreButton = (doc, win) => {
        if (doc.getElementById(CONFIG.BTN_ID)) return;

        const contentMain = findContentMain(doc);
        if (!contentMain) return;

        const btn = doc.createElement('button');
        btn.id = CONFIG.BTN_ID;
        btn.textContent = 'more+';
        btn.type = 'button';
        btn.addEventListener('click', () => toggleWatchHistory(doc, win));
        contentMain.appendChild(btn);

        const area = doc.createElement('div');
        area.id = CONFIG.AREA_ID;
        area.style.display = 'none';
        contentMain.appendChild(area);
    };

    const init = (win) => {
        const doc = win.document;
        const check = () => {
            if (!doc.getElementById(CONFIG.BTN_ID) && doc.querySelector('.flex > main')) {
                addMoreButton(doc, win);
            }
        };

        check();
        new MutationObserver(check).observe(doc.body, { childList: true, subtree: true });
    };

    // 자동 초기화
    init(window);
})();
