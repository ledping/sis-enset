from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('memoires', '0002_dossier_memoire_complet'),
    ]

    operations = [
        migrations.AddField(
            model_name='memoire',
            name='materiels_outils',
            field=models.JSONField(blank=True, default=list, help_text='Liste structurée des matériels, logiciels, outils ou méthodes utilisés.'),
        ),
        migrations.AddField(
            model_name='memoire',
            name='image_resultat_1',
            field=models.ImageField(blank=True, null=True, upload_to='memoires/resultats/'),
        ),
        migrations.AddField(
            model_name='memoire',
            name='image_resultat_2',
            field=models.ImageField(blank=True, null=True, upload_to='memoires/resultats/'),
        ),
        migrations.AddField(
            model_name='memoire',
            name='image_resultat_3',
            field=models.ImageField(blank=True, null=True, upload_to='memoires/resultats/'),
        ),
        migrations.AddField(
            model_name='memoire',
            name='image_resultat_4',
            field=models.ImageField(blank=True, null=True, upload_to='memoires/resultats/'),
        ),
        migrations.AlterField(
            model_name='memoire',
            name='materiels_methodes',
            field=models.TextField(blank=True, help_text='Texte méthodologique complémentaire affiché sous le tableau des outils.'),
        ),
    ]
