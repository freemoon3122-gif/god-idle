"""탈것: 포세이돈의 상어, 제우스의 구름"""
import json

# 상어: 오른쪽(몬스터 쪽)을 보고 헤엄친다. 빨간 눈, 벌린 입의 이빨, 아가미, 등지느러미
shark = [
    '..........................ii..............',
    '.........................iii..............',
    '........................iiii..............',
    'ii.....................iiiii..............',
    'iii.................iiiiiiiiiiii..........',
    '.iiii..........iiiiiiiiiiiiiiiiiiii.......',
    '..iiiii....iiiiiiiiiiiiiiiiiiiiiiiiiii....',
    '...iiiiiiiiiiiiiiiiiiiiiiiiiiiiiijjiiiii..',
    '...iiiiiiiiiiiiiiiIiIiIiiiiiiiiiiiejiiiiii',
    '..iiiiiiiiiiiiiiiiIiIiIiiiiiiiiiiiiiiiiiii',
    '.iiiiwwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwjwjwji',
    'iiii.wwwwwwwwwwwwwwwwwwwwwwwwwwwwjjjjjjjj.',
    'iii...wwwwwwwwwwwwwwwwwwwwwwwwwwwwwjwjwjw.',
    'ii......wwwwwwwwwwwwwwwwwwwwwwwwwwwwwww...',
    '..............iiii.......iiii.............',
    '...............iii........iii.............',
]

# 구름: 뭉게뭉게. 위는 흰색, 아래는 연한 회색 그림자, 군데군데 금빛(번개 기운)
cloud = [
    '..........kkkk.......kkkk.........',
    '.....kkk.kwwwwk....kkwwwwk..kkk...',
    '...kkwwwkwwwwwwk..kwwwwwwwkkwwwk..',
    '..kwwwwwwwwwwwwwkkwwwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk',
    'kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk',
    'kwwwwkwwwwwwwwkwwwwwwwkwwwwwwkwwwk',
    '.kkkkkkkwwwkkkkkkkwwkkkkkkkwwkkkk.',
    '...zkkkkkkkkk.zkkkkkkkkkkkkkk.z...',
    '.....z.....z.......z.......z......',
]

json.dump({'shark': shark, 'cloud': cloud}, open('mounts.json', 'w'), indent=1)
