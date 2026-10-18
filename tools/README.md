# 픽셀 아트 도구

`src/ui/sprites.ts`의 그림 데이터를 만들 때 쓴 파이썬 스크립트입니다. (Pillow 필요: `pip install pillow`)

```bash
cd tools
python3 build.py      # 신 캐릭터 → heroes.json
python3 monsters.py   # 몬스터 → monsters.json
python3 raids.py      # 레이드 보스·헤라클레스·가이아·헤르메스 → raids.json
python3 preview.py heroes.json heroes.png      # 외곽선까지 붙여서 미리보기 이미지로 저장
```

- `build.py`: 캔버스에 부위별로 찍는 방식 (머리, 옷, 검·번개·삼지창은 좌표로 계산)
- `monsters.py`: 대부분 좌우 대칭이라 왼쪽 절반만 쓰고 뒤집어 붙임
- 외곽선은 그림 데이터에 넣지 않습니다. 게임에서는 `PixelSprite`가, 미리보기에서는 `preview.py`가 자동으로 그립니다.
- 결과 json의 배열을 `sprites.ts`의 `SPRITES`에 붙여 넣으면 됩니다.
