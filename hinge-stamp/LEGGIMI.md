# Hinge stamp "Isar Things Shop"

Embosser a cerniera per marcare i biglietti con il logo completo.

- `hinge_stamp.stl` — entrambe le piastre, aperte (anteprima)
- `piastra_A_logo_rilievo.stl` + `piastra_B_logo_incavo.stl` — da stampare (una di ciascuna, piatte con il logo verso l'alto)
- `build_hinge_stamp.py` — rigenera tutto (`pip install trimesh manifold3d shapely scikit-image pillow`); parametri in cima al file

Piastre 5 mm di spessore, rilievo 0.4 mm, gioco tasca 0.15 mm (carta 80 g), manico di leva oltre il logo. Il rilievo e' a specchio: sulla carta il logo si legge dritto. Perno integrato (print-in-place) in `hinge_stamp_unico.stl`; le due piastre separate richiedono filamento da 1.75 mm nel foro da 2 mm.
Stampa consigliata: PLA, layer 0.12-0.16 mm, 100% infill. Metti il biglietto tra le piastre e premi forte.
