from django.db import migrations

# Monocytic lineage colours (purples/magentas, distinct from basophils #8064a2)
NEW_CELL_TYPES = [
    {
        "readable_name": "Monoblast",
        "machine_name": "monoblast",
        "abbr_name": "monobl",
        "visualisation_colour": "#c055b8",
        "display_order": 5,
    },
    {
        "readable_name": "Promonocyte",
        "machine_name": "promonocyte",
        "abbr_name": "promono",
        "visualisation_colour": "#e080d0",
        "display_order": 6,
    },
    {
        "readable_name": "Immature monocyte",
        "machine_name": "immature_monocyte",
        "abbr_name": "imm_mono",
        "visualisation_colour": "#a040a0",
        "display_order": 7,
    },
]

# display_order mapping: old_order -> new_order for records that need shifting
# (all records with display_order >= 5 shift up by 3)
SHIFT_MAP = {
    5: 8,  # mature_monocyte
    6: 9,  # basophils
    7: 10,  # eosinophils
    8: 11,  # lymphocytes
    9: 12,  # plasma_cells
    10: 13,  # erythroid
    11: 14,  # other
    12: 15,  # lymphoblasts
}


def add_monocytic_lineage(apps, schema_editor):
    CellType = apps.get_model("main", "CellType")

    # Shift existing display_orders >= 5 upward to make room for the three new types.
    # Process in descending order to avoid unique constraint violations on each save.
    for old_order in sorted(SHIFT_MAP.keys(), reverse=True):
        new_order = SHIFT_MAP[old_order]
        CellType.objects.filter(display_order=old_order).update(display_order=new_order)

    # Add the three new monocytic cell types
    for cell_type in NEW_CELL_TYPES:
        CellType.objects.create(
            readable_name=cell_type["readable_name"],
            machine_name=cell_type["machine_name"],
            abbr_name=cell_type["abbr_name"],
            visualisation_colour=cell_type["visualisation_colour"],
            display_order=cell_type["display_order"],
        )


def reverse_add_monocytic_lineage(apps, schema_editor):
    CellType = apps.get_model("main", "CellType")

    # Remove the three new types
    for cell_type in NEW_CELL_TYPES:
        CellType.objects.filter(machine_name=cell_type["machine_name"]).delete()

    # Shift display_orders back down (process in ascending order)
    for old_order in sorted(SHIFT_MAP.keys()):
        new_order = SHIFT_MAP[old_order]
        CellType.objects.filter(display_order=new_order).update(display_order=old_order)


class Migration(migrations.Migration):

    dependencies = [
        ("main", "0006_rename_monocyte"),
    ]

    operations = [
        migrations.RunPython(add_monocytic_lineage, reverse_add_monocytic_lineage),
    ]
