import asyncio, uuid
from services.database import async_session_maker
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel

LAYOUTS=["general-intro-slide","table-of-contents-slide","basic-info-slide","bullet-with-icons-slide",
         "numbered-bullets-slide","metrics-slide","metrics-with-image-slide","chart-with-bullets-slide",
         "quote-slide","team-slide","bullet-icons-only-slide"]
N=40
async def main():
    async with async_session_maker() as s:
        pid=uuid.uuid4()
        p=PresentationModel(id=pid, content="Deck de prueba", n_slides=N, language="Spanish",
                            title="Prueba Virtualizacion 40 slides",
                            layout={"name":"general","ordered":False,"slides":[]},
                            include_title_slide=True)
        s.add(p)
        for i in range(N):
            lid=LAYOUTS[i%len(LAYOUTS)]
            s.add(SlideModel(id=uuid.uuid4(), presentation=pid, layout_group="general",
                             layout=f"general:{lid}", index=i,
                             content={"title": f"Slide {i+1} - {lid}"}, properties={}))
        await s.commit()
        print("PRESENTATION_ID="+str(pid))
asyncio.run(main())
